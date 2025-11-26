# ⚡ Quick Deployment Guide

This is a simplified guide for the fastest deployment. For detailed options, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## 🎯 Fastest Path to Production (15 minutes)

### Step 1: Set Up MongoDB Atlas (2 minutes)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up
2. Create a free M0 cluster
3. Create database user (Database Access → Add New User)
4. Whitelist IP: Add `0.0.0.0/0` (Network Access → Add IP Address)
5. Get connection string: Clusters → Connect → Connect your application
6. Copy the connection string (replace `<password>` with your password)

### Step 2: Set Up Cloudinary (2 minutes)

1. Go to [Cloudinary](https://cloudinary.com/users/register/free) and sign up
2. Get credentials: Dashboard → Settings → Product environment credentials
   - Copy: Cloud name, API Key, API Secret
3. Create upload preset: Settings → Upload → Upload presets
   - Name: `facematch_upload`
   - Signing mode: `Unsigned`
   - Save

### Step 3: Deploy Frontend to Vercel (3 minutes)

1. Push code to GitHub (if not already)
2. Go to [Vercel](https://vercel.com) → New Project
3. Import your GitHub repository
4. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables (we'll update these after backend is deployed):
   - `VITE_CLOUDINARY_CLOUD_NAME` = Your cloud name
   - `VITE_CLOUDINARY_UPLOAD_PRESET` = `facematch_upload`
6. Deploy (note the URL - you'll need it)

### Step 4: Deploy Node.js Backend to Railway (4 minutes)

1. Go to [Railway](https://railway.app) → New Project → Deploy from GitHub
2. Select your repository
3. Add service → Select `backend` directory
4. Add environment variables:
   ```
   PORT=4000
   NODE_ENV=production
   MONGODB_URI=<your-mongodb-connection-string>
   JWT_SECRET=<generate-a-random-32-char-string>
   CLOUDINARY_CLOUD_NAME=<your-cloud-name>
   CLOUDINARY_API_KEY=<your-api-key>
   CLOUDINARY_API_SECRET=<your-api-secret>
   FLASK_SERVICE_URL=<we'll-update-this-next>
   FLASK_SERVICE_SECRET=<generate-another-random-string>
   FRONTEND_URL=<your-vercel-url>
   ```
5. Generate domain → Copy the URL (e.g., `your-backend.railway.app`)

### Step 5: Deploy Flask Backend to Railway (4 minutes)

1. In Railway, add another service → Select `flask-backend` directory
2. Add environment variables:
   ```
   FLASK_ENV=production
   FLASK_DEBUG=0
   PORT=5000
   HOST=0.0.0.0
   FLASK_SERVICE_SECRET=<same-as-backend-FLASK_SERVICE_SECRET>
   MODEL_NAME=buffalo_l
   FAISS_INDEX_PATH=./faiss_store
   ```
3. Generate domain → Copy the URL (e.g., `your-flask.railway.app`)
4. Update Node.js backend: Set `FLASK_SERVICE_URL=https://your-flask.railway.app`

### Step 6: Update Frontend Environment Variables (1 minute)

1. Go back to Vercel → Your project → Settings → Environment Variables
2. Update:
   - `VITE_API_BASE` = `https://your-backend.railway.app/api`
   - `VITE_FLASK_API_URL` = `https://your-flask.railway.app/api`
3. Redeploy (Vercel will auto-redeploy or trigger manually)

### Step 7: Test Everything

1. Visit your Vercel URL
2. Create an account
3. Create a room
4. Upload a photo
5. Test face matching

## ✅ Done!

Your app is now live! 

### URLs Summary:
- Frontend: `https://your-app.vercel.app`
- Backend API: `https://your-backend.railway.app`
- Flask Service: `https://your-flask.railway.app`

## 🔧 Troubleshooting

**CORS Errors?**
- Make sure `FRONTEND_URL` in backend matches your Vercel URL exactly

**Flask not responding?**
- Check `FLASK_SERVICE_SECRET` matches in both services
- Verify Flask service is running (check Railway logs)

**MongoDB connection failed?**
- Verify connection string has correct password
- Check IP whitelist includes Railway's IPs (or use `0.0.0.0/0`)

**Need more help?** See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed troubleshooting.

