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
  
  const envContent = `# Backend Environment Configuration
PORT=4000
NODE_ENV=development

# JWT Configuration (Generated secure secret)
JWT_SECRET=${jwtSecret}

# Upload Configuration
UPLOAD_DIR=uploads
DATA_DIR=data

# Cloudinary Configuration (REQUIRED - Replace with your actual values)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Database Configuration (Optional - for future database migration)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=facematch
DB_USER=postgres
DB_PASSWORD=password`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created with secure JWT secret');
}

// Create .env.example
const envExampleContent = `# Backend Environment Configuration
PORT=4000
NODE_ENV=development

# JWT Configuration (REQUIRED - Change this to a secure secret)
JWT_SECRET=your_super_secure_jwt_secret_key_here_change_this_in_production_123456789

# Upload Configuration
UPLOAD_DIR=uploads
DATA_DIR=data

# Cloudinary Configuration (REQUIRED - Replace with your actual values)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Database Configuration (Optional - for future database migration)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=facematch
DB_USER=postgres
DB_PASSWORD=password`;

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
