# ✅ Environment Variables Checklist

This document lists ALL required and optional environment variables for each service.

## 📋 Backend (.env in `backend/` directory)

### ✅ Required Variables

- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `JWT_SECRET` - At least 32 characters (generate: `openssl rand -base64 32`)
- [ ] `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- [ ] `CLOUDINARY_API_KEY` - Your Cloudinary API key
- [ ] `CLOUDINARY_API_SECRET` - Your Cloudinary API secret
- [ ] `FLASK_SERVICE_URL` - URL of Flask service (e.g., `http://localhost:5000`)
- [ ] `FLASK_SERVICE_SECRET` - Shared secret (must match Flask's `FLASK_SERVICE_SECRET`)
- [ ] `FRONTEND_URL` - Frontend URL for CORS (e.g., `http://localhost:5173`)

### ⚙️ Optional Variables

- [ ] `PORT` - Server port (default: `4000`)
- [ ] `NODE_ENV` - Environment (`development` or `production`)
- [ ] `UPLOAD_DIR` - Upload directory (default: `uploads`)
- [ ] `DATA_DIR` - Data directory (default: `data`)

**See**: `backend/.env.example` for template

---

## 🐍 Flask Backend (.env in `flask-backend/` directory)

### ✅ Required Variables

- [ ] `FLASK_SERVICE_SECRET` - Shared secret (must match backend's `FLASK_SERVICE_SECRET`)

### ⚙️ Optional Variables (with defaults)

- [ ] `FLASK_ENV` - Environment (`development` or `production`, default: `development`)
- [ ] `FLASK_DEBUG` - Debug mode (`0` or `1`, default: `0`)
- [ ] `PORT` - Server port (default: `5000`)
- [ ] `HOST` - Host address (default: `0.0.0.0`)
- [ ] `MODEL_NAME` - Face recognition model (default: `buffalo_l`)
- [ ] `DET_SIZE` - Detection size (default: `640,640`)
- [ ] `DEFAULT_THRESHOLD` - Match threshold (default: `0.4`)
- [ ] `MAX_TOP_K` - Maximum results (default: `50`)
- [ ] `FAISS_INDEX_PATH` - FAISS storage path (default: `./faiss_store`)
- [ ] `FAISS_AUTO_SAVE_INTERVAL` - Auto-save interval in seconds (default: `300`)
- [ ] `RATE_LIMIT_ANALYZE` - Analyze rate limit per minute (default: `20`)
- [ ] `RATE_LIMIT_MATCH` - Match rate limit per minute (default: `10`)
- [ ] `RATE_LIMIT_INGEST` - Ingest rate limit per minute (default: `30`)
- [ ] `GPU_ENABLED` - Enable GPU acceleration (default: `false`)
- [ ] `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (optional, for image downloads)
- [ ] `CLOUDINARY_API_KEY` - Cloudinary API key (optional)
- [ ] `CLOUDINARY_API_SECRET` - Cloudinary API secret (optional)

**See**: `flask-backend/.env.example` for template

---

## ⚛️ Frontend (.env in `frontend/` directory)

### ✅ Required Variables

- [ ] `VITE_API_BASE` - Backend API URL (e.g., `http://localhost:4000/api`)
- [ ] `VITE_FLASK_API_URL` - Flask API URL (e.g., `http://localhost:5000/api`)
- [ ] `VITE_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- [ ] `VITE_CLOUDINARY_UPLOAD_PRESET` - Cloudinary upload preset name

### ⚙️ Optional Variables

- [ ] `VITE_FLASK_SERVICE_SECRET` - Flask service secret (only if making direct Flask calls)
- [ ] `VITE_APP_NAME` - App name (default: `FaceMatch`)
- [ ] `VITE_APP_VERSION` - App version (default: `1.0.0`)
- [ ] `VITE_ENABLE_ANALYTICS` - Enable analytics (`true` or `false`)
- [ ] `VITE_ENABLE_DEBUG` - Enable debug mode (`true` or `false`)
- [ ] `VITE_ENABLE_PERFORMANCE_MONITORING` - Enable performance monitoring (`true` or `false`)
- [ ] `VITE_MAX_FILE_SIZE_MB` - Max file size in MB (default: `10`)
- [ ] `VITE_MAX_PHOTOS_PER_UPLOAD` - Max photos per upload (default: `50`)
- [ ] `VITE_CACHE_TTL_MINUTES` - Cache TTL in minutes (default: `5`)

**See**: `frontend/env.example` for template

---

## 🔑 How to Generate Secrets

### Generate JWT_SECRET and FLASK_SERVICE_SECRET:

**Mac/Linux:**
```bash
openssl rand -base64 32
```

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Online:**
- Visit: https://randomkeygen.com/
- Use "CodeIgniter Encryption Keys" section
- Copy a 32+ character string

---

## 📝 Quick Setup

1. **Backend**: Copy `backend/.env.example` to `backend/.env` and fill in values
2. **Flask**: Copy `flask-backend/.env.example` to `flask-backend/.env` and fill in values
3. **Frontend**: Copy `frontend/env.example` to `frontend/.env` and fill in values

**Important**: 
- `FLASK_SERVICE_SECRET` must be the **same** in both backend and flask-backend
- `JWT_SECRET` must be at least 32 characters
- Never commit `.env` files to Git!

---

## ✅ Verification

After setting up environment variables, verify:

1. **Backend starts** without errors
2. **Flask starts** without errors
3. **Frontend builds** successfully
4. **Health checks work**:
   - Backend: `http://localhost:4000/api/health`
   - Flask: `http://localhost:5000/health`

---

## 🆘 Common Issues

**"JWT_SECRET too short"**
- Ensure `JWT_SECRET` is at least 32 characters

**"Cloudinary configuration missing"**
- Verify all three Cloudinary variables are set

**"MongoDB connection failed"**
- Check `MONGODB_URI` format and credentials

**"Flask service authentication failed"**
- Ensure `FLASK_SERVICE_SECRET` matches in both backend and Flask

**"CORS error"**
- Verify `FRONTEND_URL` in backend matches your frontend URL exactly

