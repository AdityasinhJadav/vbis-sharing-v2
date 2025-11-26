const express = require('express');
const multer = require('multer');
const Photo = require('../models/Photo');
const Room = require('../models/Room');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { validateFileUpload, logger } = require('../middleware/security');
const flaskClient = require('../services/flaskClient');

const router = express.Router();

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      logger.warn('Invalid candidate file type', {
        mimetype: file.mimetype,
        ip: req.ip
      });
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post('/:roomId', requireAuth, memoryUpload.single('photo'), validateFileUpload, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ id: roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (req.user.role === 'organizer') {
      if (room.ownerId !== req.user.sub) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else {
      const user = await User.findOne({ id: req.user.sub }).populate('joinedRooms');
      const joined = user?.joinedRooms?.some(r => r.id === room.id || r._id.toString() === room._id.toString());
      if (!joined) return res.status(403).json({ error: 'You have not joined this room' });
    }

    const file = req.file;
    const analysis = await flaskClient.analyzeEmbedding(file.buffer, file.originalname);
    if (!analysis.success || !analysis.embedding) {
      return res.status(400).json({ error: analysis.message || 'Face not detected' });
    }

    // Use threshold 0.4 for better recall (catches more true matches while maintaining accuracy)
    const matchResult = await flaskClient.matchFaces(room.id, analysis.embedding, { threshold: 0.4, topK: 50 });
    const matches = matchResult.matches || [];
    
    logger.info('Face matching results from Flask', {
      roomId: room.id,
      matchesCount: matches.length,
      threshold: matchResult.threshold_used,
      sampleMatches: matches.slice(0, 3)
    });
    
    if (matches.length === 0) {
      // Check if photos exist but aren't ingested
      const totalPhotos = await Photo.countDocuments({ roomId: room.id });
      const processedPhotos = await Photo.countDocuments({ roomId: room.id, processed: true });
      
      logger.warn('No matches found', {
        roomId: room.id,
        totalPhotos,
        processedPhotos,
        message: processedPhotos === 0 ? 'No photos have been processed/ingested yet' : 'Photos processed but no matches found'
      });
      
      return res.json({
        success: true,
        matches: [],
        threshold: matchResult.threshold_used,
        message: totalPhotos === 0 
          ? 'No photos in this room yet' 
          : processedPhotos === 0 
            ? 'Photos are still being processed. Please wait a moment and try again.' 
            : 'No matching faces found. Try a different photo or lower threshold.'
      });
    }
    
    const photoIds = matches.map(m => m.id.split('#')[0]);
    const photos = await Photo.find({ id: { $in: photoIds } });

    logger.info('Found photos in database', {
      photoIdsRequested: photoIds.length,
      photosFound: photos.length
    });

    const matchesWithMetadata = matches.map(match => {
      const baseId = match.id.split('#')[0];
      const photo = photos.find(p => p.id === baseId);
      return {
        id: baseId,
        score: match.score,
        photo
      };
    }).filter(m => m.photo);

    logger.info('Final matches with metadata', {
      matchesCount: matchesWithMetadata.length
    });

    res.json({
      success: true,
      matches: matchesWithMetadata,
      threshold: matchResult.threshold_used
    });
  } catch (error) {
    logger.error('Match failed', { error: error.message });
    res.status(500).json({ error: 'Face matching failed' });
  }
});

module.exports = router;

