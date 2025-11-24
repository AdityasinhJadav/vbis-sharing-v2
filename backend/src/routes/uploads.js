const express = require('express');
const multer = require('multer');
const Photo = require('../models/Photo');
const Room = require('../models/Room');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');
const { storage } = require('../config/cloudinary');
const {
  validateFileUpload,
  logger
} = require('../middleware/security');
const flaskClient = require('../services/flaskClient');

// Background processing function for face matching
async function processPhotosInBackground(photosToProcess) {
  logger.info('Starting background photo processing', { count: photosToProcess.length });
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process photos sequentially with delays to avoid rate limiting
  // Flask has rate limit of 30 requests per minute, so we process with delays
  for (let i = 0; i < photosToProcess.length; i++) {
    const { photoId, roomId, photoUrl } = photosToProcess[i];
    
    try {
      logger.info(`Processing photo ${i + 1}/${photosToProcess.length} in background`, { photoId, roomId, photoUrl });
      
      // Ensure photoUrl is a full URL (Cloudinary should provide this)
      if (!photoUrl || (!photoUrl.startsWith('http://') && !photoUrl.startsWith('https://'))) {
        throw new Error(`Invalid photo URL format: ${photoUrl}. Expected full HTTP/HTTPS URL.`);
      }
      
      const result = await flaskClient.ingestPhoto(roomId, photoId, photoUrl);
      
      if (!result.success) {
        throw new Error(result.message || 'Ingestion failed');
      }
      
      // Update photo as processed
      await Photo.findOneAndUpdate(
        { id: photoId },
        { processed: true },
        { new: true }
      );
      
      logger.info('✅ Photo processed successfully', { photoId, roomId });
      successCount++;
      
      // Add delay between requests to avoid rate limiting (2 seconds = 30 requests per minute max)
      if (i < photosToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      
      // Check if it's a rate limit error
      if (error.response?.status === 429 || errorMsg.includes('Rate limit')) {
        logger.warn('⚠️ Rate limit hit, waiting 10 seconds before retry...', { photoId });
        await new Promise(resolve => setTimeout(resolve, 10000));
        // Retry this photo
        i--; // Decrement to retry this photo
        continue;
      }
      
      logger.error('❌ Failed to process photo in background', {
        photoId,
        roomId,
        photoUrl,
        error: errorMsg,
        fullError: error.response?.data || error.toString()
      });
      errorCount++;
      
      // Add delay even on error to avoid overwhelming the service
      if (i < photosToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  logger.info('Background photo processing completed', { 
    total: photosToProcess.length,
    success: successCount,
    failed: errorCount
  });
}

const router = express.Router();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
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
    fileSize: 10 * 1024 * 1024,
    files: 50
  }
});

router.post('/room/:roomId', requireAuth, requireRole('organizer'), (req, res, next) => {
  upload.array('photos', 20)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 10MB. Please ensure images are compressed before upload.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Too many files. Maximum is 20 files per upload.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Unexpected file field. Use "photos" field name.' });
        }
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      
      // Handle Cloudinary errors specifically
      if (err.message && (err.message.includes('cloud_name') || err.message.includes('Invalid') || err.message.includes('Cloudinary'))) {
        logger.error('Cloudinary configuration error', {
          error: err.message,
          cloudName: process.env.CLOUDINARY_CLOUD_NAME ? '***' + process.env.CLOUDINARY_CLOUD_NAME.slice(-4) : 'NOT SET',
          hasApiKey: !!process.env.CLOUDINARY_API_KEY,
          hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
        });
        return res.status(400).json({ 
          error: `Cloudinary configuration error: ${err.message}. Please verify your CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file. Visit https://cloudinary.com/console to get your credentials.` 
        });
      }
      
      if (err.message) {
        logger.error('File upload error', { error: err.message });
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: 'File upload failed' });
    }
    next();
  });
}, validateFileUpload, async (req, res) => {
  try {
    const { roomId } = req.params;
    const files = req.files || [];
    const room = await Room.findOne({ id: roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.sub) {
      return res.status(403).json({ error: 'You are not allowed to upload to this room' });
    }
    if (files.length === 0) {
      return res.status(400).json({ error: 'At least one photo is required' });
    }

    // Upload all photos quickly first
    const items = [];
    const photosToProcess = [];
    
    for (const f of files) {
      const photoId = uuidv4();
      const photo = await Photo.create({
        id: photoId,
        roomId: roomId,
        uploaderId: req.user.sub, // Organizer
        url: f.path,
        publicId: f.filename || f.public_id,
        originalName: f.originalname,
        processed: false
      });

      items.push({
        id: photo.id,
        url: photo.url,
        uploaderRole: 'organizer',
        uploadedAt: photo.createdAt
      });

      // Queue for background processing
      photosToProcess.push({ photoId: photo.id, roomId: room.id, photoUrl: photo.url });
    }

    // Return success immediately after upload
    res.json({ added: items.length, items, processing: true });

    // Process face matching in background (fire and forget)
    processPhotosInBackground(photosToProcess).catch(error => {
      logger.error('Background photo processing error', {
        error: error.message,
        photosCount: photosToProcess.length
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List photos in a room (organizer or joined attendee)
router.get('/room/:roomId', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ id: roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (req.user.role === 'organizer') {
      if (room.ownerId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
    } else {
      const user = await User.findOne({ id: req.user.sub }).populate('joinedRooms');
      const joined = user?.joinedRooms?.some(r => r.id === room.id || r._id.toString() === room._id.toString());
      if (!joined) {
        return res.status(403).json({ error: 'You have not joined this room' });
      }
    }

    const photos = await Photo.find({ roomId });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retry ingestion for unprocessed photos (organizer only)
router.post('/room/:roomId/retry-ingestion', requireAuth, requireRole('organizer'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ id: roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.sub) {
      return res.status(403).json({ error: 'You are not allowed to retry ingestion for this room' });
    }

    const unprocessedPhotos = await Photo.find({ roomId, processed: false });
    
    if (unprocessedPhotos.length === 0) {
      return res.json({ 
        message: 'All photos are already processed',
        retried: 0,
        processed: 0,
        failed: 0
      });
    }

    const photosToProcess = unprocessedPhotos.map(photo => ({
      photoId: photo.id,
      roomId: room.id,
      photoUrl: photo.url
    }));

    logger.info('Retrying ingestion for room', {
      roomId: room.id,
      roomName: room.name,
      photoCount: unprocessedPhotos.length
    });

    // Process in background
    processPhotosInBackground(photosToProcess).catch(error => {
      logger.error('Retry ingestion error', {
        error: error.message,
        photosCount: photosToProcess.length
      });
    });

    res.json({
      message: `Retrying ingestion for ${unprocessedPhotos.length} photos. Processing in background...`,
      retried: unprocessedPhotos.length,
      processing: true,
      note: 'Check server logs for progress. Photos will be processed asynchronously.'
    });
  } catch (error) {
    logger.error('Retry ingestion route error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get ingestion status for a room (organizer only)
router.get('/room/:roomId/ingestion-status', requireAuth, requireRole('organizer'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ id: roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const totalPhotos = await Photo.countDocuments({ roomId });
    const processedPhotos = await Photo.countDocuments({ roomId, processed: true });
    const unprocessedPhotos = await Photo.countDocuments({ roomId, processed: false });

    const unprocessedList = await Photo.find(
      { roomId, processed: false },
      { id: 1, originalName: 1, createdAt: 1, url: 1 }
    ).limit(10).sort({ createdAt: -1 });

    res.json({
      roomId: room.id,
      roomName: room.name,
      totalPhotos,
      processedPhotos,
      unprocessedPhotos,
      processingProgress: totalPhotos > 0 ? Math.round((processedPhotos / totalPhotos) * 100) : 0,
      sampleUnprocessed: unprocessedList.map(p => ({
        id: p.id,
        name: p.originalName,
        uploadedAt: p.createdAt,
        url: p.url
      }))
    });
  } catch (error) {
    logger.error('Ingestion status route error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


