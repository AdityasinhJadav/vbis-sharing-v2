/**
 * Environment configuration and validation
 */

// Environment variables with defaults
const config = {
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE || 'http://localhost:4000/api',
  FLASK_API_URL: import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000/api',
  
  // Firebase Configuration
  FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  
  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  
  // App Configuration
  APP_NAME: import.meta.env.VITE_APP_NAME || 'FaceMatch',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  
  // Feature Flags
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  ENABLE_PERFORMANCE_MONITORING: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
  
  // Performance Settings
  MAX_FILE_SIZE_MB: parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB) || 10,
  MAX_PHOTOS_PER_UPLOAD: parseInt(import.meta.env.VITE_MAX_PHOTOS_PER_UPLOAD) || 50,
  CACHE_TTL_MINUTES: parseInt(import.meta.env.VITE_CACHE_TTL_MINUTES) || 5,
  
  // Security Settings
  JWT_STORAGE_KEY: 'facematch_jwt_token',
  USER_STORAGE_KEY: 'facematch_user_data',
  EVENT_STORAGE_KEY: 'facematch_current_event'
};

// Validate required environment variables
const validateConfig = () => {
  const requiredVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_UPLOAD_PRESET'
  ];

  const missing = requiredVars.filter(varName => !config[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Development-specific configuration
const developmentConfig = {
  ...config,
  ENABLE_DEBUG: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  LOG_LEVEL: 'debug'
};

// Production-specific configuration
const productionConfig = {
  ...config,
  ENABLE_DEBUG: false,
  ENABLE_PERFORMANCE_MONITORING: false,
  LOG_LEVEL: 'error'
};

// Get environment-specific configuration
const getConfig = () => {
  const baseConfig = config.NODE_ENV === 'production' ? productionConfig : developmentConfig;
  
  // Validate configuration
  validateConfig();
  
  return baseConfig;
};

// Environment utilities
export const envUtils = {
  // Check if running in development
  isDevelopment: () => config.NODE_ENV === 'development',
  
  // Check if running in production
  isProduction: () => config.NODE_ENV === 'production',
  
  // Check if feature is enabled
  isFeatureEnabled: (feature) => {
    const featureMap = {
      analytics: config.ENABLE_ANALYTICS,
      debug: config.ENABLE_DEBUG,
      performance: config.ENABLE_PERFORMANCE_MONITORING
    };
    return featureMap[feature] || false;
  },
  
  // Get API URL for specific service
  getApiUrl: (service = 'main') => {
    const urls = {
      main: config.API_BASE_URL,
      flask: config.FLASK_API_URL
    };
    return urls[service] || config.API_BASE_URL;
  },
  
  // Get storage key with prefix
  getStorageKey: (key) => {
    const prefix = config.APP_NAME.toLowerCase().replace(/\s+/g, '_');
    return `${prefix}_${key}`;
  }
};

// Error handling for missing configuration
export const handleConfigError = (error) => {
  console.error('Configuration error:', error);
  
  if (config.NODE_ENV === 'development') {
    console.warn('Please check your .env file and ensure all required variables are set.');
  } else {
    console.error('Configuration error in production. Please contact support.');
  }
};

// Export the validated configuration
export default getConfig();
