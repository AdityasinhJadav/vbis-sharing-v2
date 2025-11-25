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
const { sendSuccess, sendAppError, ErrorCodes } = require('../utils/response');
const { AppError } = require('../utils/AppError');
const { schemas, validate } = require('../utils/validation');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Enhanced signup with validation and logging
router.post('/signup', signupLimiter, validate(schemas.signup), async (req, res) => {
  try {
    const { email, password, role, username } = req.body;

    logger.info('Signup attempt', { email, role, ip: req.ip });

    // Check if user exists
    const exists = await User.findOne({ email: email.toLowerCase() });

    if (exists) {
      throw new AppError('Email already registered', 409, ErrorCodes.EMAIL_ALREADY_EXISTS);
    }

    // Check username if provided
    if (username) {
      const usernameExists = await User.findOne({ username: username.trim() });
      if (usernameExists) {
        throw new AppError('Username already taken', 409, ErrorCodes.USERNAME_ALREADY_TAKEN);
      }
    }

    const passwordHash = await bcrypt.hash(password, 12); // Increased rounds for security

    const user = await User.create({
      id: uuidv4(),
      email,
      passwordHash,
      role,
      lastLogin: null,
      username: username?.trim() || null
    });

    const token = jwt.sign(
      { sub: user.id, email, role, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('User registered successfully', { userId: user.id, email, role, username: user.username });

    sendSuccess(res, {
      token,
      user: { id: user.id, email, role, username: user.username },
      expiresIn: '7d'
    }, 'User registered successfully');

  } catch (error) {
    if (error instanceof AppError) {
      return sendAppError(res, error);
    }
    logger.error('Signup error', { error: error.message, email: req.body.email });
    sendAppError(res, new AppError('Registration failed. Please try again.', 500, ErrorCodes.INTERNAL_ERROR));
  }
});

// Enhanced login with validation and logging
router.post('/login', authLimiter, validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info('Login attempt', { email, ip: req.ip });

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      logger.warn('Login failed - user not found', { email, ip: req.ip });
      throw new AppError('Invalid credentials', 401, ErrorCodes.UNAUTHORIZED);
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      logger.warn('Login failed - invalid password', { email, ip: req.ip });
      throw new AppError('Invalid credentials', 401, ErrorCodes.UNAUTHORIZED);
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

    sendSuccess(res, {
      token,
      user: { id: user.id, email: user.email, role: user.role, username: user.username },
      expiresIn: '7d'
    }, 'Login successful');

  } catch (error) {
    if (error instanceof AppError) {
      return sendAppError(res, error);
    }
    logger.error('Login error', { error: error.message, email: req.body.email });
    sendAppError(res, new AppError('Login failed. Please try again.', 500, ErrorCodes.INTERNAL_ERROR));
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
router.put('/username', requireAuth, validate(schemas.updateUsername), async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.sub;

    // Check if username is already taken
    const existingUser = await User.findOne({ 
      username: username.trim(),
      id: { $ne: userId }
    });

    if (existingUser) {
      throw new AppError('Username already taken', 409, ErrorCodes.USERNAME_ALREADY_TAKEN);
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
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

    sendSuccess(res, {
      token,
      user: { id: user.id, email: user.email, role: user.role, username: user.username }
    }, 'Username updated successfully');

  } catch (error) {
    if (error instanceof AppError) {
      return sendAppError(res, error);
    }
    logger.error('Username update error', { error: error.message, userId: req.user?.sub });
    sendAppError(res, new AppError('Failed to update username. Please try again.', 500, ErrorCodes.INTERNAL_ERROR));
  }
});

module.exports = router;


