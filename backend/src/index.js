const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const roomsRoutes = require('./routes/rooms');
const uploadRoutes = require('./routes/uploads');
const matchRoutes = require('./routes/match');

const app = express();

const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const DATA_DIR = process.env.DATA_DIR || 'data';

// Ensure data and upload directories exist
const absoluteUploadDir = path.join(__dirname, '..', UPLOAD_DIR);
const absoluteDataDir = path.join(__dirname, '..', DATA_DIR);
if (!fs.existsSync(absoluteUploadDir)) {
  fs.mkdirSync(absoluteUploadDir, { recursive: true });
}
if (!fs.existsSync(absoluteDataDir)) {
  fs.mkdirSync(absoluteDataDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static serving for uploaded files
app.use('/uploads', express.static(absoluteUploadDir));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/match', matchRoutes);

app.use((err, req, res, next) => {
  // Basic error handler
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});


