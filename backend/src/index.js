const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const morgan = require('morgan');

require('dotenv').config();

const {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  securityHeaders,
  validateEnvironment,
  requestLogger,
  errorHandler,
  logger
} = require('./middleware/security');
const { monitoring } = require('./middleware/monitoring');

const authRoutes = require('./routes/auth');
const roomsRoutes = require('./routes/rooms');
const uploadRoutes = require('./routes/uploads');
const matchRoutes = require('./routes/match');

const app = express();

// Validate environment variables on startup
try {
  validateEnvironment();
} catch (error) {
  logger.error('Environment validation failed', { error: error.message });
  process.exit(1);
}

const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const DATA_DIR = process.env.DATA_DIR || 'data';

// Ensure directories exist
const absoluteUploadDir = path.join(__dirname, '..', UPLOAD_DIR);
const absoluteDataDir = path.join(__dirname, '..', DATA_DIR);
const logsDir = path.join(__dirname, '..', 'logs');

[absoluteUploadDir, absoluteDataDir, logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Security middleware (order matters!)
app.use(securityHeaders);
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(requestLogger);

// Monitoring middleware
app.use(monitoring.trackRequest.bind(monitoring));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/uploads', uploadLimiter);

// Body parsing with limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Add raw body for signature verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static serving for uploaded files
app.use('/uploads', express.static(absoluteUploadDir));

// Health check with detailed status
app.get('/api/health', async (req, res) => {
  try {
    const healthStatus = await monitoring.getHealthStatus();
    res.status(healthStatus.status === 'healthy' ? 200 : 503).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed metrics endpoint (for monitoring tools)
app.get('/api/metrics', async (req, res) => {
  try {
    const systemMetrics = await monitoring.getSystemMetrics();
    const appMetrics = monitoring.getApplicationMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      application: appMetrics
    });
  } catch (error) {
    logger.error('Metrics collection failed:', error);
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// API routes with rate limiting
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/match', matchRoutes);

// 404 handler
app.use((req, res) => {
  logger.warn('404 - Route not found', { 
    url: req.originalUrl, 
    method: req.method,
    ip: req.ip 
  });
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API listening on http://localhost:${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});