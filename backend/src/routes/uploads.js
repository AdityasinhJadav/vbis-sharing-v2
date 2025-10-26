const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body } = require('express-validator');
const { requireAuth, requireRole } = require('../middleware/auth');
const { readJson, writeJson } = require('../utils/store');
const { storage } = require('../config/cloudinary');
const { 
  validateRequest, 
  validateFileUpload, 
  logger 
} = require('../middleware/security');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const absoluteUploadDir = path.join(__dirname, '..', '..', UPLOAD_DIR);

// Photos store per room: photos-<roomId>.json = { photos: [{ id, filename, url, uploaderRole, uploadedAt }] }
function getPhotos(roomId) {
  return readJson(`photos-${roomId}.json`, { photos: [] });
}
function savePhotos(roomId, data) {
  writeJson(`photos-${roomId}.json`, data);
}

// Enhanced Cloudinary storage with file filtering
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      logger.warn('Invalid file type attempted', { 
        mimetype: file.mimetype,
        originalname: file.originalname,
        ip: req.ip 
      });
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 50 // Maximum 50 files per request
  }
});

// Keep local storage as fallback with enhanced security
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(absoluteUploadDir, { recursive: true });
    cb(null, absoluteUploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(sanitizedName));
  }
});

const localUpload = multer({ 
  storage: localStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// Validation for upload-photos endpoint
const uploadValidation = [
  body('passcode').isLength({ min: 1, max: 10 }).trim().withMessage('Passcode is required (max 10 characters)'),
  body('user_id').isLength({ min: 1 }).trim().withMessage('User ID is required'),
  body('event_id').optional().isLength({ min: 1 }).trim().withMessage('Event ID must be valid if provided')
];

// Enhanced route for event-based photo uploads (using Cloudinary)
router.post('/upload-photos', 
  uploadValidation,
  validateRequest,
  upload.array('photos', 50), 
  validateFileUpload,
  (req, res) => {
    try {
      const { passcode, user_id, event_id } = req.body;
      const files = req.files || [];
      
      logger.info('Photo upload attempt', { 
        passcode, 
        user_id, 
        event_id, 
        fileCount: files.length,
        ip: req.ip 
      });
      
      if (files.length === 0) {
        logger.warn('Upload failed - no files', { passcode, user_id, ip: req.ip });
        return res.status(400).json({ 
          success: false, 
          message: 'At least one photo is required' 
        });
      }

      // Map uploaded files to response format with enhanced metadata
      const uploadedPhotos = files.map(file => ({
        id: file.filename,
        cloudinaryPublicId: file.public_id,
        cloudinaryUrl: file.path,
        originalName: file.originalname,
        passcode: passcode,
        event_id: event_id,
        uploadedBy: user_id,
        uploadedAt: new Date().toISOString(),
        width: file.width,
        height: file.height,
        fileSize: file.size,
        format: file.format,
        secureUrl: file.secure_url
      }));

      logger.info('Photos uploaded successfully', { 
        passcode, 
        user_id, 
        uploadedCount: files.length 
      });

      res.json({ 
        success: true, 
        uploaded_count: files.length,
        photos: uploadedPhotos,
        message: `Successfully uploaded ${files.length} photo${files.length > 1 ? 's' : ''}`
      });
      
    } catch (error) {
      logger.error('Upload error', { 
        error: error.message, 
        stack: error.stack,
        passcode: req.body.passcode,
        user_id: req.body.user_id,
        ip: req.ip 
      });
      
      res.status(500).json({ 
        success: false, 
        message: 'Upload failed. Please try again.' 
      });
    }
  }
);

// Organizer uploads reference photos to a room (legacy route)
router.post('/room/:roomId', requireAuth, requireRole('organizer'), localUpload.array('photos', 20), (req, res) => {
  const { roomId } = req.params;
  const files = req.files || [];
  const db = getPhotos(roomId);
  const items = files.map(f => ({
    id: path.parse(f.filename).name,
    filename: f.filename,
    url: `/uploads/${f.filename}`,
    uploaderRole: 'organizer',
    uploadedAt: new Date().toISOString(),
  }));
  db.photos.push(...items);
  savePhotos(roomId, db);
  res.json({ added: items.length, items });
});

// Attendee uploads a candidate photo (single) - legacy route
router.post('/candidate/:roomId', localUpload.single('photo'), (req, res) => {
  const { roomId } = req.params;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'photo file required' });
  const entry = {
    id: path.parse(file.filename).name,
    filename: file.filename,
    url: `/uploads/${file.filename}`,
    uploaderRole: 'attendee',
    uploadedAt: new Date().toISOString(),
  };
  const db = getPhotos(roomId);
  // Store attendee uploads too (optional)
  db.photos.push(entry);
  savePhotos(roomId, db);
  res.json({ item: entry });
});

// List photos in a room (organizer only)
router.get('/room/:roomId', requireAuth, requireRole('organizer'), (req, res) => {
  const { roomId } = req.params;
  const db = getPhotos(roomId);
  res.json(db.photos);
});

module.exports = router;


