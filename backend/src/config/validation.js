const logger = require('../middleware/security').logger;

/**
 * Validates environment configuration on startup
 */
function validateConfig() {
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

  // Validate Cloudinary configuration
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    logger.error('Cloudinary configuration incomplete');
    throw new Error('Cloudinary configuration is required for file uploads');
  }

  logger.info('Configuration validation passed', {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4000,
    hasCloudinary: !!process.env.CLOUDINARY_CLOUD_NAME
  });
}

module.exports = { validateConfig };
