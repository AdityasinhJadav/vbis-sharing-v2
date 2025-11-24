const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const {
  validateRequest,
  authValidation,
  signupValidation,
  authLimiter,
  signupLimiter,
  logger
} = require('../middleware/security');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Enhanced signup with validation and logging
router.post('/signup', signupLimiter, signupValidation, validateRequest, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    logger.info('Signup attempt', { email, role, ip: req.ip });

    // Check if user exists
    const exists = await User.findOne({ email: email.toLowerCase() });

    if (exists) {
      logger.warn('Signup failed - email already exists', { email, ip: req.ip });
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12); // Increased rounds for security

    const user = await User.create({
      id: uuidv4(),
      email,
      passwordHash,
      role,
      lastLogin: null,
      username: req.body.username || null
    });

    const token = jwt.sign(
      { sub: user.id, email, role, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('User registered successfully', { userId: user.id, email, role, username: user.username });

    res.json({
      token,
      user: { id: user.id, email, role, username: user.username },
      expiresIn: '7d'
    });

  } catch (error) {
    logger.error('Signup error', { error: error.message, email: req.body.email });
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Enhanced login with validation and logging
router.post('/login', authLimiter, authValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info('Login attempt', { email, ip: req.ip });

    const user = await User.findOne({ email: email.toLowerCase() });

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
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('User logged in successfully', { userId: user.id, email, username: user.username });

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, username: user.username },
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
    // Fetch latest user data including username
    User.findOne({ id: decoded.sub }).then(user => {
      if (user) {
        res.json({ 
          valid: true, 
          user: { 
            id: user.id, 
            email: user.email, 
            role: user.role, 
            username: user.username 
          } 
        });
      } else {
        res.json({ valid: true, user: decoded });
      }
    }).catch(() => {
      res.json({ valid: true, user: decoded });
    });

  } catch (error) {
    logger.warn('Token verification failed', { error: error.message, ip: req.ip });
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update username endpoint
router.put('/username', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.sub;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (username.length > 30) {
      return res.status(400).json({ error: 'Username must be less than 30 characters' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' });
    }

    // Check if username is already taken
    const existingUser = await User.findOne({ 
      username: username.trim(),
      id: { $ne: userId }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.username = username.trim();
    await user.save();

    // Generate new token with updated username
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('Username updated', { userId, username: user.username });

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, username: user.username }
    });

  } catch (error) {
    logger.error('Username update error', { error: error.message, userId: req.user?.sub });
    res.status(500).json({ error: 'Failed to update username. Please try again.' });
  }
});

module.exports = router;


