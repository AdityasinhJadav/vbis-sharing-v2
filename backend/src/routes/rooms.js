const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

router.post('/', requireAuth, requireRole('organizer'), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    let code = generateCode();
    while (await Room.findOne({ code })) {
      code = generateCode();
    }

    const room = await Room.create({
      id: uuidv4(),
      name,
      description,
      ownerId: req.user.sub,
      code
    });

    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/mine', requireAuth, requireRole('organizer'), async (req, res) => {
  try {
    const rooms = await Room.find({ ownerId: req.user.sub });
    res.json(rooms);
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

    res.json({ message: 'Joined room successfully', room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get joined rooms
router.get('/joined', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.sub }).populate('joinedRooms');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.joinedRooms);
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

module.exports = router;


