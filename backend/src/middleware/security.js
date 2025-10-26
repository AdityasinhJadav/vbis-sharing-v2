const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 uploads per minute
  message: {
    error: 'Too many uploads, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "https://api.cloudinary.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Input validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors', { 
      errors: errors.array(), 
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// File upload validation
const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file = req.file || (req.files && req.files[0]);
  if (!file) {
    return res.status(400).json({ error: 'Invalid file upload' });
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    logger.warn('Invalid file type attempted', { 
      mimetype: file.mimetype,
      ip: req.ip 
    });
    return res.status(400).json({ 
      error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
    });
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    logger.warn('File too large attempted', { 
      size: file.size,
      ip: req.ip 
    });
    return res.status(400).json({ 
      error: 'File too large. Maximum size is 10MB.' 
    });
  }

  next();
};

// Environment validation
const validateEnvironment = () => {
  const requiredVars = [
    'JWT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET === 'change_me' || process.env.JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET is not secure');
    throw new Error('JWT_SECRET must be at least 32 characters long and not the default value');
  }

  logger.info('Environment validation passed');
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
};

// Validation schemas
const authValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const signupValidation = [
  ...authValidation,
  body('role').isIn(['organizer', 'attendee']).withMessage('Role must be organizer or attendee'),
];

const roomValidation = [
  body('name').isLength({ min: 1, max: 100 }).trim().withMessage('Room name is required (max 100 characters)'),
  body('description').optional().isLength({ max: 500 }).trim().withMessage('Description must be less than 500 characters'),
];

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  securityHeaders,
  validateRequest,
  validateFileUpload,
  validateEnvironment,
  requestLogger,
  errorHandler,
  authValidation,
  signupValidation,
  roomValidation,
  logger
};
