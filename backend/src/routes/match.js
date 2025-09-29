const express = require('express');
const path = require('path');
const { readJson } = require('../utils/store');

const router = express.Router();

// Stub match: returns photos uploaded by organizer in the room
// If candidateUrl provided, pretend to match and filter by simple filename heuristic
router.post('/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const { candidateUrl } = req.body || {};
  const db = readJson(`photos-${roomId}.json`, { photos: [] });
  // Only organizer uploaded photos are considered as reference set
  const reference = db.photos.filter(p => p.uploaderRole === 'organizer');
  if (!candidateUrl) return res.json({ matches: reference });
  const candidateBase = path.parse(String(candidateUrl)).name.toLowerCase();
  const matches = reference.filter(p => path.parse(p.filename).name.toLowerCase().includes(candidateBase));
  res.json({ matches });
});

module.exports = router;


