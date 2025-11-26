const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');
const User = require('../models/User');
const Photo = require('../models/Photo');
const { requireAuth, requireRole } = require('../middleware/auth');
const { cloudinary } = require('../config/cloudinary');
const { logger } = require('../middleware/security');
const flaskClient = require('../services/flaskClient');

const router = express.Router();

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function addParticipantCounts(rooms) {
  if (!rooms || rooms.length === 0) {
    return rooms?.map?.(room => room?.toObject ? room.toObject() : room) || [];
  }

  const normalized = rooms.map(room => (room?.toObject ? room.toObject() : room));
  const roomObjectIds = normalized
    .map(room => room?._id)
    .filter(Boolean);

  if (roomObjectIds.length === 0) {
    return normalized.map(room => ({ ...room, participants: 0 }));
  }

  const counts = await User.aggregate([
    { $unwind: '$joinedRooms' },
    { $match: { joinedRooms: { $in: roomObjectIds } } },
    { $group: { _id: '$joinedRooms', count: { $sum: 1 } } }
  ]);

  const countMap = new Map(counts.map(item => [item._id.toString(), item.count]));

  return normalized.map(room => ({
    ...room,
    participants: countMap.get(room?._id?.toString?.() || '') || 0
  }));
}

router.post('/', requireAuth, requireRole('organizer'), async (req, res) => {
  try {
    const { name, description, eventDate } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    let code = generateCode();
    while (await Room.findOne({ code })) {
      code = generateCode();
    }

    let normalizedDate = null;
    if (eventDate) {
      const parsed = new Date(eventDate);
      if (!Number.isNaN(parsed.getTime())) {
        normalizedDate = parsed;
      }
    }

    const room = await Room.create({
      id: uuidv4(),
      name,
      description,
      ownerId: req.user.sub,
      code,
      eventDate: normalizedDate
    });

    const createdRoom = room.toObject();
    createdRoom.participants = 0;

    res.json(createdRoom);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/mine', requireAuth, requireRole('organizer'), async (req, res) => {
  try {
    const rooms = await Room.find({ ownerId: req.user.sub }).lean();
    const enriched = await addParticipantCounts(rooms);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/by-code/:code', requireAuth, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backward compatibility: by-key also searches by code
router.get('/by-key/:key', async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.key.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join a room by code
router.post('/join', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const room = await Room.findOne({ code: code?.toUpperCase() });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const user = await User.findOne({ id: req.user.sub });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.joinedRooms.some(r => r.toString() === room._id.toString())) {
      user.joinedRooms.push(room._id);
    }

    await user.save();

    const [roomWithCount] = await addParticipantCounts([room]);

    res.json({ message: 'Joined room successfully', room: roomWithCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get joined rooms
router.get('/joined', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.sub }).populate('joinedRooms');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const rooms = await addParticipantCounts(user.joinedRooms || []);
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:roomId', requireAuth, async (req, res) => {
  try {
    const room = await Room.findOne({ id: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (req.user.role === 'organizer') {
      if (room.ownerId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
    } else {
      const user = await User.findOne({ id: req.user.sub }).populate('joinedRooms');
      const joined = user?.joinedRooms?.some(r => r.id === room.id || r._id.toString() === room._id.toString());
      if (!joined) return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:roomId', requireAuth, requireRole('organizer'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ id: roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.sub) {
      return res.status(403).json({ error: 'You are not allowed to delete this room' });
    }

    const photos = await Photo.find({ roomId: room.id });
    let cloudinaryRemoved = 0;
    let cloudinaryFailed = 0;

    await Promise.allSettled(
      photos.map(async (photo) => {
        if (!photo.publicId) return;
        try {
          await cloudinary.uploader.destroy(photo.publicId, { invalidate: true });
          cloudinaryRemoved += 1;
        } catch (error) {
          cloudinaryFailed += 1;
          logger.error('Cloudinary delete failed', {
            roomId: room.id,
            photoId: photo.id,
            publicId: photo.publicId,
            error: error.message
          });
        }
      })
    );

    await Photo.deleteMany({ roomId: room.id });
    await User.updateMany({ joinedRooms: room._id }, { $pull: { joinedRooms: room._id } });
    await Room.deleteOne({ _id: room._id });

    let flaskCleared = false;
    try {
      await flaskClient.clearEvent(room.id);
      flaskCleared = true;
    } catch (error) {
      logger.warn('Failed to clear Flask index for room', {
        roomId: room.id,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: `Room "${room.name}" deleted`,
      photosDeleted: photos.length,
      cloudinaryRemoved,
      cloudinaryFailed,
      flaskCleared
    });
  } catch (error) {
    logger.error('Room deletion failed', {
      roomId: req.params.roomId,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

module.exports = router;


