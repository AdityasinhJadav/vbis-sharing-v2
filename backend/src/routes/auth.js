const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('../utils/store');
const { 
  validateRequest, 
  authValidation, 
  signupValidation, 
  logger 
} = require('../middleware/security');
const { db } = require('../config/database');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Simple user store in JSON: { users: [{ id, email, passwordHash, role, createdAt, lastLogin }] }
function getUsers() {
  return readJson('users.json', { users: [] });
}

function saveUsers(data) {
  writeJson('users.json', data);
}

// Enhanced signup with validation and logging
router.post('/signup', signupValidation, validateRequest, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    logger.info('Signup attempt', { email, role, ip: req.ip });
    
    const db = getUsers();
    const exists = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (exists) {
      logger.warn('Signup failed - email already exists', { email, ip: req.ip });
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    const passwordHash = await bcrypt.hash(password, 12); // Increased rounds for security
    const user = { 
      id: uuidv4(), 
      email, 
      passwordHash, 
      role,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    
    db.users.push(user);
    saveUsers(db);
    
    const token = jwt.sign(
      { sub: user.id, email, role }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    logger.info('User registered successfully', { userId: user.id, email, role });
    
    res.json({ 
      token, 
      user: { id: user.id, email, role },
      expiresIn: '7d'
    });
    
  } catch (error) {
    logger.error('Signup error', { error: error.message, email: req.body.email });
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Enhanced login with validation and logging
router.post('/login', authValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    logger.info('Login attempt', { email, ip: req.ip });
    
    const db = getUsers();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      logger.warn('Login failed - user not found', { email, ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      logger.warn('Login failed - invalid password', { email, ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    saveUsers(db);
    
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    logger.info('User logged in successfully', { userId: user.id, email });
    
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, role: user.role },
      expiresIn: '7d'
    });
    
  } catch (error) {
    logger.error('Login error', { error: error.message, email: req.body.email });
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Token verification endpoint
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
    
  } catch (error) {
    logger.warn('Token verification failed', { error: error.message, ip: req.ip });
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;


