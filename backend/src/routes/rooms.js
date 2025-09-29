const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');
const { readJson, writeJson } = require('../utils/store');

const router = express.Router();

// Rooms store: { rooms: [{ id, name, key, ownerId, createdAt }] }
function getRooms() {
  return readJson('rooms.json', { rooms: [] });
}
function saveRooms(data) {
  writeJson('rooms.json', data);
}

router.post('/', requireAuth, requireRole('organizer'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const db = getRooms();
  const room = {
    id: uuidv4(),
    name,
    key: Math.random().toString(36).slice(2, 8).toUpperCase(),
    ownerId: req.user.sub,
    createdAt: new Date().toISOString(),
  };
  db.rooms.push(room);
  saveRooms(db);
  res.json(room);
});

router.get('/mine', requireAuth, requireRole('organizer'), (req, res) => {
  const db = getRooms();
  const rooms = db.rooms.filter(r => r.ownerId === req.user.sub);
  res.json(rooms);
});

router.get('/by-key/:key', (req, res) => {
  const db = getRooms();
  const room = db.rooms.find(r => r.key === req.params.key.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

module.exports = router;


