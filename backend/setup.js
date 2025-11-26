#!/usr/bin/env node

/**
 * FaceMatch Backend Setup Script
 * This script helps set up the backend environment
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 FaceMatch Backend Setup');
console.log('========================\n');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
  console.log('📝 Please update the values in .env file if needed\n');
} else {
  console.log('📝 Creating .env file...');
  
  // Generate a secure JWT secret
  const jwtSecret = crypto.randomBytes(64).toString('hex');
  
  // Generate Flask service secret
  const flaskSecret = crypto.randomBytes(32).toString('base64');
  
  const envContent = `# Backend Environment Configuration
PORT=4000
NODE_ENV=development

# Database Configuration (REQUIRED)
# For local MongoDB: mongodb://localhost:27017/facematch
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/facematch?retryWrites=true&w=majority
MONGODB_URI=mongodb://localhost:27017/facematch

# JWT Configuration (Generated secure secret - 64 characters)
JWT_SECRET=${jwtSecret}

# Cloudinary Configuration (REQUIRED - Replace with your actual values)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Flask Service Configuration (REQUIRED)
FLASK_SERVICE_URL=http://localhost:5000
FLASK_SERVICE_SECRET=${flaskSecret}

# Frontend URL (REQUIRED for CORS)
FRONTEND_URL=http://localhost:5173

# Upload Configuration (Optional)
UPLOAD_DIR=uploads
DATA_DIR=data`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created with secure JWT secret');
}

// Create .env.example
const envExampleContent = `# Backend Environment Configuration
PORT=4000
NODE_ENV=development

# Database Configuration (REQUIRED)
# For local MongoDB: mongodb://localhost:27017/facematch
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/facematch?retryWrites=true&w=majority
MONGODB_URI=mongodb://localhost:27017/facematch

# JWT Configuration (REQUIRED - must be at least 32 characters)
# Generate with: openssl rand -base64 32
JWT_SECRET=your_super_secure_jwt_secret_here_minimum_32_characters_long

# Cloudinary Configuration (REQUIRED - Replace with your actual values)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Flask Service Configuration (REQUIRED)
FLASK_SERVICE_URL=http://localhost:5000
# Generate with: openssl rand -base64 32 (must match Flask's FLASK_SERVICE_SECRET)
FLASK_SERVICE_SECRET=your_shared_secret_between_backends

# Frontend URL (REQUIRED for CORS)
FRONTEND_URL=http://localhost:5173

# Upload Configuration (Optional)
UPLOAD_DIR=uploads
DATA_DIR=data`;

fs.writeFileSync(envExamplePath, envExampleContent);
console.log('✅ .env.example file created');

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('\n📦 Installing dependencies...');
  console.log('   Run: npm install');
} else {
  console.log('✅ Dependencies already installed');
}

console.log('\n🎯 Next Steps:');
console.log('1. Update Cloudinary credentials in .env file');
console.log('2. Run: npm install (if not already done)');
console.log('3. Run: npm run dev');
console.log('\n📚 For more information, see README.md');
