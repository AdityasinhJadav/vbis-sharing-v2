# FaceMatch Setup Guide

This guide will help you set up the FaceMatch application on your local machine or server.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **Python** 3.8+ (3.9 recommended) with pip
- **Git**

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/AdityasinhJadav/vbis-sharing-v2.git
cd vbis-sharing-v2
```

### 2. Install All Dependencies

```bash
npm run install:all
```

Or install manually:

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# Flask backend (optional for face recognition)
cd ../flask-backend && pip install -r requirements-advanced.txt
```

### 3. Set Up Environment Variables

#### Backend (`backend/.env`)

Copy the example file and fill in your credentials:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Security (IMPORTANT: Change this in production!)
JWT_SECRET=your_super_secure_jwt_secret_here_change_this_in_production

# File Storage
UPLOAD_DIR=uploads
DATA_DIR=data

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Flask Service
FLASK_SERVICE_URL=http://localhost:5000
```

**Getting Cloudinary Credentials:**
1. Sign up at https://cloudinary.com/
2. Go to Dashboard
3. Copy Cloud Name, API Key, and API Secret

#### Frontend (`frontend/.env`)

Copy the example file and fill in your credentials:

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```env
# API Configuration
VITE_API_BASE=http://localhost:4000/api
VITE_FLASK_API_BASE=http://localhost:5000

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**Getting Firebase Credentials:**
1. Go to https://console.firebase.google.com/
2. Create a new project or select existing
3. Go to Project Settings > General
4. Scroll to "Your apps" and click on Web app icon
5. Copy the configuration values

### 4. Start the Services

#### Option A: Start All Services Together (Recommended)

```bash
npm run dev
```

This will start both backend and frontend concurrently.

#### Option B: Start Services Separately

**Terminal 1 - Backend:**
```bash
npm run dev:backend
# Or: cd backend && npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
# Or: cd frontend && npm run dev
```

**Terminal 3 - Flask (Optional for face recognition):**
```bash
npm run dev:flask
# Or: cd flask-backend && python run_advanced.py
```

### 5. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:4000/api
- **Flask Service:** http://localhost:5000
- **Health Check:** http://localhost:4000/api/health

## Verification

### Check Backend

```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### Check Frontend

Open http://localhost:5173 in your browser. You should see the FaceMatch home page.

### Check Flask (if running)

```bash
curl http://localhost:5000/health
```

## Troubleshooting

### Port Already in Use

If you get an error that a port is already in use:

```bash
# Find process using the port
lsof -i :4000  # or :5173 or :5000

# Kill the process
kill -9 <PID>
```

### Firebase Authentication Errors

1. Verify your Firebase credentials in `frontend/.env`
2. Check that Firebase Authentication is enabled in Firebase Console
3. Add your domain to Firebase Console > Authentication > Settings > Authorized domains

### Cloudinary Upload Errors

1. Verify Cloudinary credentials in `backend/.env`
2. Check upload size limits (default: 10MB)
3. Verify allowed file types in Cloudinary settings

### Node Version Issues

If you encounter issues related to Node.js version:

```bash
# Check your Node version
node --version

# Update to Node 18+
nvm install 18
nvm use 18
```

### Python Dependencies Issues

If Flask backend fails to install:

```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r flask-backend/requirements-advanced.txt
```

## Production Deployment

### Environment Variables

For production, update the following:

1. Set `NODE_ENV=production` in backend/.env
2. Generate a strong JWT_SECRET
3. Update API URLs to your production domain
4. Configure CORS settings for your domain
5. Set up SSL certificates

### Build Frontend

```bash
npm run build:frontend
```

This creates optimized production files in `frontend/dist/`.

### Start Backend in Production

```bash
cd backend && npm start
```

## Additional Configuration

### Linting

Run ESLint to check for code issues:

```bash
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Security Audit

Check for security vulnerabilities:

```bash
npm run audit

# Auto-fix vulnerabilities
npm run audit:fix
```

### Cleaning Build Artifacts

```bash
npm run clean
```

## Next Steps

1. Read the [CONTRIBUTING.md](CONTRIBUTING.md) guide if you want to contribute
2. Check the main [README.md](README.md) for detailed feature documentation
3. Explore the API documentation in the README

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Search existing [GitHub Issues](https://github.com/AdityasinhJadav/vbis-sharing-v2/issues)
3. Open a new issue with detailed information about your problem

## Support

For questions or help:

- 📧 Email: support@facematch.com
- 💬 Discord: [Join our community](https://discord.gg/facematch)
- 🐛 Issues: [GitHub Issues](https://github.com/AdityasinhJadav/vbis-sharing-v2/issues)

---

Happy coding! 🎉
