const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('../utils/store');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Simple user store in JSON: { users: [{ id, email, passwordHash, role }] }
function getUsers() {
  return readJson('users.json', { users: [] });
}
function saveUsers(data) {
  writeJson('users.json', data);
}

router.post('/signup', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'email, password, role required' });
  const db = getUsers();
  const exists = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = { id: uuidv4(), email, passwordHash, role };
  db.users.push(user);
  saveUsers(db);
  const token = jwt.sign({ sub: user.id, email, role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email, role } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email, password required' });
  const db = getUsers();
  const user = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

module.exports = router;


