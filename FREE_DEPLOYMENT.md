# 🆓 Free Deployment Guide - FaceMatch

This guide shows you how to deploy your FaceMatch application **completely FREE** using free tiers of various services.

## ✅ Free Services We'll Use

1. **Vercel** - Free hosting for frontend (unlimited)
2. **Render** - Free tier for backends (with limitations)
3. **MongoDB Atlas** - Free M0 cluster (512MB storage)
4. **Cloudinary** - Free tier (25GB storage, 25GB bandwidth/month)

## ⚠️ Free Tier Limitations

- **Render**: Services sleep after 15 minutes of inactivity (wake up on first request)
- **MongoDB Atlas**: 512MB storage limit
- **Cloudinary**: 25GB bandwidth/month
- **Render**: Limited to 750 hours/month (shared across all services)

**Note**: For production with consistent uptime, consider paid tiers. But this works great for testing, demos, and low-traffic applications!

---

## 🚀 Step-by-Step Free Deployment

### Step 1: Set Up MongoDB Atlas (FREE) - 3 minutes

1. **Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)**
   - Click "Try Free"
   - Sign up with email or Google

2. **Create a Free Cluster**
   - Choose "M0 Sandbox" (FREE)
   - Select a cloud provider and region (closest to you)
   - Click "Create Cluster" (takes 1-3 minutes)

3. **Create Database User**
   - Go to "Database Access" → "Add New Database User"
   - Authentication: Password
   - Username: `facematch_user` (or any name)
   - Password: Generate secure password (SAVE THIS!)
   - Database User Privileges: "Atlas admin" (or "Read and write to any database")
   - Click "Add User"

4. **Whitelist IP Addresses**
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (adds `0.0.0.0/0`)
   - Click "Confirm"
   - ⚠️ **Security Note**: For production, restrict to specific IPs later

5. **Get Connection String**
   - Go to "Clusters" → Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Example: `mongodb+srv://facematch_user:YourPassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - **SAVE THIS** - You'll need it!

---

### Step 2: Set Up Cloudinary (FREE) - 2 minutes

1. **Go to [Cloudinary](https://cloudinary.com/users/register/free)**
   - Click "Sign Up for Free"
   - Sign up with email or social login

2. **Get Your Credentials**
   - After signup, go to Dashboard
   - Click "Settings" (gear icon) → "Product environment credentials"
   - Copy these values (you'll need them):
     - **Cloud name**: `your-cloud-name`
     - **API Key**: `123456789012345`
     - **API Secret**: `abcdefghijklmnopqrstuvwxyz`

3. **Create Upload Preset** (for frontend direct uploads)
   - Go to "Settings" → "Upload" → "Upload presets"
   - Click "Add upload preset"
   - Settings:
     - **Preset name**: `facematch_upload`
     - **Signing mode**: `Unsigned` (important!)
     - **Folder**: `facematch` (optional, for organization)
     - **Upload manipulation**: Leave defaults
   - Click "Save"

---

### Step 3: Deploy Frontend to Vercel (FREE) - 5 minutes

1. **Push Code to GitHub** (if not already)
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Go to [Vercel](https://vercel.com)**
   - Sign up/login with GitHub
   - Click "Add New..." → "Project"

3. **Import Your Repository**
   - Select your GitHub repository
   - Click "Import"

4. **Configure Project**
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `frontend` (click "Edit" and set this)
   - **Build Command**: `npm run build` (should be auto-filled)
   - **Output Directory**: `dist` (should be auto-filled)
   - **Install Command**: `npm install` (should be auto-filled)

5. **Add Environment Variables**
   - Click "Environment Variables"
   - Add these (we'll update API URLs after backend is deployed):
     ```
     VITE_CLOUDINARY_CLOUD_NAME = your-cloud-name
     VITE_CLOUDINARY_UPLOAD_PRESET = facematch_upload
     ```
   - Click "Save"

6. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-3 minutes)
   - **Copy the deployment URL** (e.g., `https://face-match.vercel.app`)
   - You'll need this for backend configuration

---

### Step 4: Deploy Node.js Backend to Render (FREE) - 8 minutes

1. **Go to [Render](https://render.com)**
   - Sign up/login with GitHub
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Select your GitHub repository
   - Click "Connect"

3. **Configure Service**
   - **Name**: `facematch-backend` (or any name)
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend` (important!)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free** (select this!)

4. **Add Environment Variables**
   Click "Advanced" → "Add Environment Variable" and add:
   ```
   NODE_ENV = production
   PORT = 4000
   MONGODB_URI = mongodb+srv://facematch_user:YourPassword@cluster0.xxxxx.mongodb.net/facematch?retryWrites=true&w=majority
   JWT_SECRET = [Generate a random 32+ character string]
   CLOUDINARY_CLOUD_NAME = your-cloud-name
   CLOUDINARY_API_KEY = your-api-key
   CLOUDINARY_API_SECRET = your-api-secret
   FLASK_SERVICE_URL = [We'll update this after Flask is deployed]
   FLASK_SERVICE_SECRET = [Generate another random string - same as Flask]
   FRONTEND_URL = https://your-app.vercel.app
   ```

   **To generate random secrets:**
   ```bash
   # On Mac/Linux:
   openssl rand -base64 32
   
   # Or use online: https://randomkeygen.com/
   # Use "CodeIgniter Encryption Keys" - copy one
   ```

5. **Create Service**
   - Click "Create Web Service"
   - Wait for deployment (3-5 minutes)
   - **Copy the service URL** (e.g., `https://facematch-backend.onrender.com`)
   - ⚠️ **Note**: First deployment takes longer. Service will "sleep" after 15 min inactivity.

---

### Step 5: Deploy Flask Backend to Render (FREE) - 8 minutes

1. **In Render Dashboard**, click "New +" → "Web Service"

2. **Connect Same Repository**
   - Select your GitHub repository again
   - Click "Connect"

3. **Configure Service**
   - **Name**: `facematch-flask`
   - **Region**: Same as backend
   - **Branch**: `main`
   - **Root Directory**: `flask-backend` (important!)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements-advanced.txt`
   - **Start Command**: `gunicorn app_advanced:app --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120`
   - **Plan**: **Free**
   
   **Note**: Using `gunicorn` is better for production. The app already supports `$PORT` environment variable, so this will work perfectly!

4. **Add Environment Variables**
   ```
   FLASK_ENV = production
   FLASK_DEBUG = 0
   PORT = 5000
   HOST = 0.0.0.0
   FLASK_SERVICE_SECRET = [Same as FLASK_SERVICE_SECRET in backend]
   MODEL_NAME = buffalo_l
   DET_SIZE = 640,640
   DEFAULT_THRESHOLD = 0.4
   MAX_TOP_K = 50
   FAISS_INDEX_PATH = ./faiss_store
   FAISS_AUTO_SAVE_INTERVAL = 300
   RATE_LIMIT_ANALYZE = 20
   RATE_LIMIT_MATCH = 10
   RATE_LIMIT_INGEST = 30
   GPU_ENABLED = false
   ```

5. **Create Service**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes - Flask takes longer due to ML dependencies)
   - **Copy the service URL** (e.g., `https://facematch-flask.onrender.com`)

---

### Step 6: Update Service URLs - 2 minutes

1. **Update Node.js Backend Environment Variables**
   - Go to Render → Your backend service → "Environment"
   - Update `FLASK_SERVICE_URL` to: `https://facematch-flask.onrender.com`
   - Click "Save Changes"
   - Render will automatically redeploy

2. **Update Frontend Environment Variables**
   - Go to Vercel → Your project → Settings → Environment Variables
   - Add/Update:
     ```
     VITE_API_BASE = https://facematch-backend.onrender.com/api
     VITE_FLASK_API_URL = https://facematch-flask.onrender.com/api
     ```
   - Go to "Deployments" → Click "..." on latest deployment → "Redeploy"

---

### Step 7: Test Your Deployment - 5 minutes

1. **Test Frontend**
   - Visit your Vercel URL
   - Should see the FaceMatch homepage

2. **Test Backend Health**
   - Visit: `https://facematch-backend.onrender.com/api/health`
   - Should return JSON with status

3. **Test Flask Health**
   - Visit: `https://facematch-flask.onrender.com/health`
   - Should return JSON with status
   - ⚠️ **First request may be slow** (service waking up from sleep)

4. **Test Full Flow**
   - Create an account on your Vercel site
   - Create a room
   - Upload a photo
   - Test face matching

---

## 🎉 Congratulations!

Your app is now deployed for **FREE**!

### Your URLs:
- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://facematch-backend.onrender.com`
- **Flask Service**: `https://facematch-flask.onrender.com`

---

## ⚠️ Important Notes About Free Tiers

### Render Free Tier Limitations:

1. **Service Sleep**: Services sleep after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds (cold start)
   - Subsequent requests are fast
   - **Solution**: Use a monitoring service to ping your services every 10 minutes (free options: UptimeRobot, Pingdom)

2. **Monthly Hours**: 750 hours/month shared across all services
   - With 2 services, that's ~375 hours each = ~15 days of uptime
   - **Solution**: Only keep one service "always on" if needed

3. **Build Time**: Limited build minutes per month
   - Usually enough for normal usage

### Solutions for Better Uptime:

**Option 1: Use UptimeRobot (FREE)**
1. Sign up at [UptimeRobot](https://uptimerobot.com) (free tier: 50 monitors)
2. Add monitors for:
   - Backend: `https://facematch-backend.onrender.com/api/health` (every 5 minutes)
   - Flask: `https://facematch-flask.onrender.com/health` (every 5 minutes)
3. This keeps services awake

**Option 2: Upgrade to Paid Tier**
- Render: $7/month per service for always-on
- Better for production use

---

## 🔧 Troubleshooting

### Service Won't Start

**Check Render Logs:**
- Go to Render → Your service → "Logs"
- Look for errors

**Common Issues:**

1. **"Module not found"**
   - Check `requirements.txt` or `package.json` has all dependencies
   - Verify build command installs dependencies

2. **"Port already in use"**
   - Make sure start command uses `$PORT` environment variable
   - For Flask: `python -c "import os; app.run(port=int(os.environ.get('PORT', 5000)))"`

3. **"MongoDB connection failed"**
   - Verify `MONGODB_URI` is correct
   - Check IP whitelist in MongoDB Atlas includes Render IPs (or `0.0.0.0/0`)

4. **"CORS error"**
   - Verify `FRONTEND_URL` in backend matches your Vercel URL exactly
   - Check CORS configuration in backend code

### Service Too Slow

- **First request slow**: Normal for free tier (cold start)
- **Subsequent requests slow**: Check Render logs for errors
- **Consider**: Upgrade to paid tier for better performance

### Environment Variables Not Working

- **Render**: Make sure you saved environment variables
- **Vercel**: Redeploy after adding environment variables
- **Check**: Variable names match exactly (case-sensitive)

---

## 📊 Free Tier Summary

| Service | Free Tier | Limitations |
|---------|-----------|--------------|
| **Vercel** | ✅ Unlimited | None (generous free tier) |
| **Render** | ✅ 750 hrs/month | Sleeps after 15 min, shared hours |
| **MongoDB Atlas** | ✅ M0 Cluster | 512MB storage |
| **Cloudinary** | ✅ 25GB | 25GB bandwidth/month |

**Total Cost: $0/month** 🎉

---

## 🚀 Next Steps

1. **Set up monitoring** (UptimeRobot) to keep services awake
2. **Test all features** thoroughly
3. **Monitor usage** to stay within free tier limits
4. **Consider upgrading** if you need:
   - Always-on services
   - More storage/bandwidth
   - Better performance

---

## 💡 Tips for Free Deployment

1. **Use UptimeRobot** to prevent services from sleeping
2. **Monitor Cloudinary usage** - 25GB bandwidth can go fast with images
3. **Optimize images** - Use compression to save bandwidth
4. **Monitor MongoDB** - 512MB is enough for thousands of users
5. **Set up alerts** - Get notified if services go down

---

**Need Help?** Check the main [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for more detailed troubleshooting.

**Happy Free Deploying! 🆓🚀**

