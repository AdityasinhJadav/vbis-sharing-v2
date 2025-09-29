const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireRole } = require('../middleware/auth');
const { readJson, writeJson } = require('../utils/store');
const { storage } = require('../config/cloudinary');

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

// Use Cloudinary storage instead of local storage
const upload = multer({ storage });

// Keep local storage as fallback
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(absoluteUploadDir, { recursive: true });
    cb(null, absoluteUploadDir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const localUpload = multer({ storage: localStorage });

// New route for event-based photo uploads (using Cloudinary)
router.post('/upload-photos', upload.array('photos', 50), (req, res) => {
  try {
    const { passcode, user_id, event_id } = req.body;
    const files = req.files || [];
    
    if (!passcode || !user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passcode and user_id are required' 
      });
    }
    
    if (files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one photo is required' 
      });
    }

    // Map uploaded files to response format
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
      fileSize: file.size
    }));

    res.json({ 
      success: true, 
      uploaded_count: files.length,
      photos: uploadedPhotos
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Upload failed: ' + error.message 
    });
  }
});

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


