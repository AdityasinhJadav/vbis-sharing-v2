const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const logger = require('../middleware/security').logger;

// Validate Cloudinary credentials
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  logger.error('Cloudinary configuration missing', {
    hasCloudName: !!cloudName,
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret
  });
  throw new Error('Cloudinary configuration is incomplete. Please check your environment variables.');
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

// Test Cloudinary connection on startup
cloudinary.api.ping()
  .then(result => {
    logger.info('Cloudinary connection successful', {
      cloudName: cloudName,
      status: result.status
    });
  })
  .catch(error => {
    logger.error('Cloudinary connection failed on startup', {
      cloudName: cloudName,
      error: error.message,
      hint: 'Please verify your CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file'
    });
    // Log warning but don't throw - let it fail on first upload with better error
    console.warn('⚠️  WARNING: Cloudinary configuration appears invalid. Uploads will fail until fixed.');
    console.warn('   Please check: https://cloudinary.com/console for your correct credentials');
  });

// Configure Cloudinary storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'facematch',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { width: 1920, height: 1080, crop: 'limit' },
        { quality: 'auto:good' }
      ],
    };
  },
});

module.exports = {
  cloudinary,
  storage
};
