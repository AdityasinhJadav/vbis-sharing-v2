# ⚡ Quick Free Deployment Checklist

## 🎯 7 Steps to Deploy for FREE

### ✅ Step 1: MongoDB Atlas (3 min)
- [ ] Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
- [ ] Create M0 FREE cluster
- [ ] Create database user (save password!)
- [ ] Whitelist IP: `0.0.0.0/0`
- [ ] Copy connection string

### ✅ Step 2: Cloudinary (2 min)
- [ ] Sign up at [Cloudinary](https://cloudinary.com/users/register/free)
- [ ] Copy: Cloud name, API Key, API Secret
- [ ] Create upload preset: `facematch_upload` (Unsigned)

### ✅ Step 3: Vercel Frontend (5 min)
- [ ] Push code to GitHub
- [ ] Go to [Vercel](https://vercel.com) → New Project
- [ ] Root Directory: `frontend`
- [ ] Add env vars:
  - `VITE_CLOUDINARY_CLOUD_NAME`
  - `VITE_CLOUDINARY_UPLOAD_PRESET`
- [ ] Deploy → Copy URL

### ✅ Step 4: Render Backend (8 min)
- [ ] Go to [Render](https://render.com) → New Web Service
- [ ] Root Directory: `backend`
- [ ] Build: `npm install`
- [ ] Start: `npm start`
- [ ] Plan: **FREE**
- [ ] Add ALL env vars (see guide)
- [ ] Deploy → Copy URL

### ✅ Step 5: Render Flask (8 min)
- [ ] Render → New Web Service
- [ ] Root Directory: `flask-backend`
- [ ] Build: `pip install -r requirements-advanced.txt`
- [ ] Start: `gunicorn app_advanced:app --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120`
- [ ] Plan: **FREE**
- [ ] Add ALL env vars (see guide)
- [ ] Deploy → Copy URL

### ✅ Step 6: Update URLs (2 min)
- [ ] Update backend `FLASK_SERVICE_URL`
- [ ] Update frontend `VITE_API_BASE` and `VITE_FLASK_API_URL`
- [ ] Redeploy both

### ✅ Step 7: Test (5 min)
- [ ] Visit Vercel URL
- [ ] Test: `/api/health` and `/health`
- [ ] Create account
- [ ] Upload photo
- [ ] Test matching

## 🔑 Generate Secrets

```bash
# JWT_SECRET and FLASK_SERVICE_SECRET (use same for both)
openssl rand -base64 32
```

Or use: https://randomkeygen.com/ (CodeIgniter Encryption Keys)

## 📝 Environment Variables Checklist

### Backend (Render)
- [ ] `NODE_ENV=production`
- [ ] `PORT=4000`
- [ ] `MONGODB_URI=...`
- [ ] `JWT_SECRET=...`
- [ ] `CLOUDINARY_CLOUD_NAME=...`
- [ ] `CLOUDINARY_API_KEY=...`
- [ ] `CLOUDINARY_API_SECRET=...`
- [ ] `FLASK_SERVICE_URL=...` (update after Flask deploys)
- [ ] `FLASK_SERVICE_SECRET=...`
- [ ] `FRONTEND_URL=...` (your Vercel URL)

### Flask (Render)
- [ ] `FLASK_ENV=production`
- [ ] `FLASK_DEBUG=0`
- [ ] `PORT=5000`
- [ ] `HOST=0.0.0.0`
- [ ] `FLASK_SERVICE_SECRET=...` (same as backend)
- [ ] `MODEL_NAME=buffalo_l`
- [ ] `FAISS_INDEX_PATH=./faiss_store`
- [ ] All other vars from guide

### Frontend (Vercel)
- [ ] `VITE_CLOUDINARY_CLOUD_NAME=...`
- [ ] `VITE_CLOUDINARY_UPLOAD_PRESET=facematch_upload`
- [ ] `VITE_API_BASE=...` (update after backend deploys)
- [ ] `VITE_FLASK_API_URL=...` (update after Flask deploys)

## ⚠️ Free Tier Notes

- **Render sleeps after 15 min** - Use [UptimeRobot](https://uptimerobot.com) (free) to ping every 5 min
- **First request slow** - Normal (cold start ~30-60s)
- **750 hours/month** - Shared across services (~15 days each)

## 🆘 Quick Troubleshooting

**CORS Error?** → Check `FRONTEND_URL` matches Vercel URL exactly

**Service won't start?** → Check Render logs for errors

**MongoDB error?** → Verify connection string and IP whitelist

**Flask slow?** → Normal for free tier, first request takes time

---

**Full Guide**: See [FREE_DEPLOYMENT.md](FREE_DEPLOYMENT.md) for detailed instructions!

