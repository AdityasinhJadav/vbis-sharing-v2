# 🚀 FaceMatch Deployment Guide

This comprehensive guide covers multiple deployment options for your FaceMatch application. Choose the deployment method that best fits your needs.

## 📋 Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Option 1: Vercel + Railway/Render (Recommended for Beginners)](#option-1-vercel--railwayrender-recommended-for-beginners)
4. [Option 2: AWS Deployment](#option-2-aws-deployment)
5. [Option 3: DigitalOcean App Platform](#option-3-digitalocean-app-platform)
6. [Option 4: Docker + VPS (Advanced)](#option-4-docker--vps-advanced)
7. [Option 5: Full Server Deployment](#option-5-full-server-deployment)
8. [Post-Deployment Checklist](#post-deployment-checklist)
9. [Troubleshooting](#troubleshooting)

---

## Deployment Overview

Your FaceMatch application consists of **4 main components**:

1. **Frontend** (React/Vite) - Port 5173 (dev) / Static files (production)
2. **Node.js Backend** (Express) - Port 4000
3. **Flask Backend** (Python) - Port 5000
4. **MongoDB** - Database (can use MongoDB Atlas)

### Deployment Architecture Options

```
Option 1 (Easiest):
Frontend → Vercel/Netlify
Backend → Railway/Render
Flask → Railway/Render (separate service)
MongoDB → MongoDB Atlas (free tier)

Option 2 (Cloud Platform):
All services → AWS (EC2, ECS, or Elastic Beanstalk)
MongoDB → MongoDB Atlas or AWS DocumentDB

Option 3 (Managed Platform):
All services → DigitalOcean App Platform
MongoDB → MongoDB Atlas

Option 4 (Self-Hosted):
All services → VPS (DigitalOcean, Linode, etc.)
MongoDB → MongoDB Atlas or self-hosted
```

---

## Prerequisites

Before deploying, ensure you have:

- ✅ **Cloudinary Account** - [Sign up (free tier available)](https://cloudinary.com/users/register/free)
- ✅ **MongoDB Atlas Account** - [Sign up (free tier available)](https://www.mongodb.com/cloud/atlas)
- ✅ **GitHub/GitLab Repository** - Your code should be in a repository
- ✅ **Environment Variables** - All required secrets and API keys

### Required Environment Variables

#### Backend (.env)
```env
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/facematch
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FLASK_SERVICE_URL=https://your-flask-service.railway.app
FLASK_SERVICE_SECRET=your_shared_secret
FRONTEND_URL=https://your-frontend.vercel.app
```

#### Flask Backend (.env)
```env
FLASK_ENV=production
FLASK_DEBUG=0
PORT=5000
HOST=0.0.0.0
FLASK_SERVICE_SECRET=your_shared_secret
MODEL_NAME=buffalo_l
DET_SIZE=640,640
DEFAULT_THRESHOLD=0.4
MAX_TOP_K=50
FAISS_INDEX_PATH=./faiss_store
RATE_LIMIT_ANALYZE=20
RATE_LIMIT_MATCH=10
RATE_LIMIT_INGEST=30
GPU_ENABLED=false
```

#### Frontend (.env)
```env
VITE_API_BASE=https://your-backend.railway.app/api
VITE_FLASK_API_URL=https://your-flask-service.railway.app/api
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

---

## Option 1: Vercel + Railway/Render (Recommended for Beginners)

This is the **easiest and fastest** way to deploy your application with minimal configuration.

### Step 1: Deploy Frontend to Vercel

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Go to [Vercel](https://vercel.com)** and sign up/login

3. **Import your repository**
   - Click "New Project"
   - Select your GitHub repository
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`

4. **Add Environment Variables** in Vercel:
   - `VITE_API_BASE` = `https://your-backend.railway.app/api`
   - `VITE_FLASK_API_URL` = `https://your-flask-service.railway.app/api`
   - `VITE_CLOUDINARY_CLOUD_NAME` = Your Cloudinary cloud name
   - `VITE_CLOUDINARY_UPLOAD_PRESET` = Your Cloudinary upload preset

5. **Deploy** - Vercel will automatically build and deploy

### Step 2: Deploy Node.js Backend to Railway

1. **Go to [Railway](https://railway.app)** and sign up/login

2. **Create a new project** → "Deploy from GitHub repo"

3. **Select your repository** and configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Add Environment Variables**:
   - Copy all variables from `backend/.env` (see Prerequisites section)

5. **Generate a domain** - Railway will provide a URL like `your-backend.railway.app`

6. **Update Frontend** - Go back to Vercel and update `VITE_API_BASE` with the Railway URL

### Step 3: Deploy Flask Backend to Railway

1. **Create another Railway service** in the same project

2. **Configure**:
   - **Root Directory**: `flask-backend`
   - **Build Command**: 
     ```bash
     pip install -r requirements-advanced.txt
     ```
   - **Start Command**: 
     ```bash
     python run_advanced.py
     ```

3. **Add Environment Variables**:
   - Copy all variables from `flask-backend/.env`

4. **Important**: Set `PORT` environment variable (Railway will provide it via `$PORT`)

5. **Update Flask Service URL** in Node.js backend environment variables

### Step 4: Set Up MongoDB Atlas

1. **Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)**

2. **Create a free cluster** (M0 Sandbox)

3. **Create a database user**:
   - Database Access → Add New User
   - Username and password

4. **Whitelist IP addresses**:
   - Network Access → Add IP Address
   - For Railway/Render: Add `0.0.0.0/0` (allow all - for production, restrict later)

5. **Get connection string**:
   - Clusters → Connect → Connect your application
   - Copy the connection string
   - Replace `<password>` with your database password
   - Use this in `MONGODB_URI`

### Step 5: Configure Cloudinary

1. **Go to [Cloudinary Dashboard](https://cloudinary.com/console)**

2. **Get your credentials**:
   - Settings → Product environment credentials
   - Copy: Cloud name, API Key, API Secret

3. **Create Upload Preset** (for frontend direct uploads):
   - Settings → Upload → Upload presets
   - Create new preset:
     - Name: `facematch_upload`
     - Signing mode: `Unsigned` (for frontend uploads)
     - Folder: `facematch`
   - Save and use the preset name in frontend `.env`

### Alternative: Using Render Instead of Railway

**Render** is another great option with a free tier:

1. **Go to [Render](https://render.com)** and sign up

2. **For Node.js Backend**:
   - New → Web Service
   - Connect GitHub repo
   - Settings:
     - **Name**: `facematch-backend`
     - **Root Directory**: `backend`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   - Add all environment variables
   - Deploy

3. **For Flask Backend**:
   - New → Web Service
   - Settings:
     - **Name**: `facematch-flask`
     - **Root Directory**: `flask-backend`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements-advanced.txt`
     - **Start Command**: `gunicorn app_advanced:app --bind 0.0.0.0:$PORT`
   - Add all environment variables
   - Deploy

**Note**: For Flask on Render, you may need to install `gunicorn`:
```bash
pip install gunicorn
```

---

## Option 2: AWS Deployment

### Architecture
- **Frontend**: AWS Amplify or S3 + CloudFront
- **Backend**: AWS Elastic Beanstalk or ECS
- **Flask**: ECS Fargate or EC2
- **MongoDB**: MongoDB Atlas (recommended) or AWS DocumentDB

### Step 1: Deploy Frontend to AWS Amplify

1. **Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)**

2. **New App** → Host web app → GitHub

3. **Configure**:
   - Repository: Your GitHub repo
   - Branch: `main`
   - Build settings:
     ```yaml
     version: 1
     frontend:
       phases:
         preBuild:
           commands:
             - cd frontend
             - npm install
         build:
           commands:
             - npm run build
       artifacts:
         baseDirectory: frontend/dist
         files:
           - '**/*'
       cache:
         paths:
           - frontend/node_modules/**/*
     ```

4. **Add Environment Variables** (same as Vercel)

5. **Deploy**

### Step 2: Deploy Backend to Elastic Beanstalk

1. **Install EB CLI**:
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB** in backend directory:
   ```bash
   cd backend
   eb init -p "Node.js" facematch-backend
   ```

3. **Create environment**:
   ```bash
   eb create facematch-prod
   ```

4. **Set environment variables**:
   ```bash
   eb setenv MONGODB_URI=... JWT_SECRET=... CLOUDINARY_CLOUD_NAME=...
   ```

5. **Deploy**:
   ```bash
   eb deploy
   ```

### Step 3: Deploy Flask to ECS Fargate

1. **Create Dockerfile** for Flask (see Option 4)

2. **Build and push to ECR**:
   ```bash
   aws ecr create-repository --repository-name facematch-flask
   docker build -t facematch-flask .
   docker tag facematch-flask:latest <account>.dkr.ecr.<region>.amazonaws.com/facematch-flask:latest
   docker push <account>.dkr.ecr.<region>.amazonaws.com/facematch-flask:latest
   ```

3. **Create ECS Task Definition** and **ECS Service**

4. **Configure Load Balancer** and **Security Groups**

---

## Option 3: DigitalOcean App Platform

DigitalOcean App Platform is a managed platform similar to Railway/Render.

### Step 1: Deploy All Services

1. **Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)**

2. **Create App** → GitHub

3. **Add Components**:

   **Component 1: Frontend**
   - Type: Static Site
   - Source: `frontend/`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables: Frontend vars

   **Component 2: Node.js Backend**
   - Type: Web Service
   - Source: `backend/`
   - Build Command: `npm install`
   - Run Command: `npm start`
   - HTTP Port: `4000`
   - Environment Variables: Backend vars

   **Component 3: Flask Backend**
   - Type: Web Service
   - Source: `flask-backend/`
   - Build Command: `pip install -r requirements-advanced.txt`
   - Run Command: `python run_advanced.py`
   - HTTP Port: `5000`
   - Environment Variables: Flask vars

4. **Deploy** - DigitalOcean handles everything automatically

---

## Option 4: Docker + VPS (Advanced)

This option gives you full control and is cost-effective for production.

### Step 1: Create Dockerfiles

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 4000

# Start application
CMD ["node", "src/index.js"]
```

**Flask Dockerfile** (`flask-backend/Dockerfile`):
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements-advanced.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-advanced.txt

# Copy application code
COPY . .

# Create FAISS store directory
RUN mkdir -p ./faiss_store

# Expose port
EXPOSE 5000

# Start application
CMD ["python", "run_advanced.py"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`):
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Nginx Config** (`frontend/nginx.conf`):
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (optional - if you want to proxy through nginx)
    location /api {
        proxy_pass http://backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Docker Compose** (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_BASE=http://your-domain.com/api
      - VITE_FLASK_API_URL=http://your-domain.com:5000/api

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
      - FLASK_SERVICE_URL=http://flask:5000
      - FLASK_SERVICE_SECRET=${FLASK_SERVICE_SECRET}
      - FRONTEND_URL=http://your-domain.com
    depends_on:
      - flask

  flask:
    build:
      context: ./flask-backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    volumes:
      - ./flask-backend/faiss_store:/app/faiss_store
    environment:
      - FLASK_ENV=production
      - PORT=5000
      - FLASK_SERVICE_SECRET=${FLASK_SERVICE_SECRET}
      - MODEL_NAME=buffalo_l
      - FAISS_INDEX_PATH=./faiss_store
```

### Step 2: Deploy to VPS

1. **Get a VPS** (DigitalOcean Droplet, Linode, etc.)
   - Recommended: 4GB RAM, 2 vCPUs minimum
   - OS: Ubuntu 22.04 LTS

2. **SSH into your server**:
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Docker and Docker Compose**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   apt-get install docker-compose-plugin
   ```

4. **Clone your repository**:
   ```bash
   git clone https://github.com/your-username/face-match.git
   cd face-match
   ```

5. **Create `.env` file** with all environment variables

6. **Build and start services**:
   ```bash
   docker compose up -d --build
   ```

7. **Set up Nginx reverse proxy** (for SSL/HTTPS):
   ```bash
   apt-get install nginx certbot python3-certbot-nginx
   ```

8. **Configure Nginx** (`/etc/nginx/sites-available/facematch`):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:80;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /api {
           proxy_pass http://localhost:4000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /flask {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

9. **Enable site and get SSL**:
   ```bash
   ln -s /etc/nginx/sites-available/facematch /etc/nginx/sites-enabled/
   nginx -t
   systemctl reload nginx
   certbot --nginx -d your-domain.com
   ```

---

## Option 5: Full Server Deployment

For maximum control, deploy directly on a server without Docker.

### Step 1: Server Setup

1. **Get a VPS** (Ubuntu 22.04 recommended)

2. **Update system**:
   ```bash
   apt-get update && apt-get upgrade -y
   ```

3. **Install Node.js 18**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt-get install -y nodejs
   ```

4. **Install Python 3.9+**:
   ```bash
   apt-get install -y python3.9 python3-pip python3-venv
   ```

5. **Install MongoDB** (or use MongoDB Atlas):
   ```bash
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   apt-get update
   apt-get install -y mongodb-org
   systemctl start mongod
   systemctl enable mongod
   ```

6. **Install Nginx**:
   ```bash
   apt-get install -y nginx
   ```

7. **Install PM2** (process manager):
   ```bash
   npm install -g pm2
   ```

### Step 2: Deploy Applications

1. **Clone repository**:
   ```bash
   cd /var/www
   git clone https://github.com/your-username/face-match.git
   cd face-match
   ```

2. **Set up Node.js Backend**:
   ```bash
   cd backend
   npm install --production
   cp .env.example .env
   # Edit .env with your values
   pm2 start src/index.js --name facematch-backend
   pm2 save
   pm2 startup
   ```

3. **Set up Flask Backend**:
   ```bash
   cd ../flask-backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements-advanced.txt
   cp .env.example .env
   # Edit .env with your values
   pm2 start run_advanced.py --name facematch-flask --interpreter python3
   pm2 save
   ```

4. **Build and serve Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run build
   # Copy dist to nginx directory
   cp -r dist/* /var/www/html/
   ```

5. **Configure Nginx** (see Option 4, Step 7)

---

## Post-Deployment Checklist

After deploying, verify everything works:

- [ ] **Frontend loads** - Visit your frontend URL
- [ ] **Backend health check** - `https://your-backend.com/api/health`
- [ ] **Flask health check** - `https://your-flask.com/health`
- [ ] **User registration** - Create a test account
- [ ] **Photo upload** - Upload a test photo
- [ ] **Face matching** - Test face matching functionality
- [ ] **SSL/HTTPS** - Ensure all connections use HTTPS
- [ ] **CORS** - Verify CORS is configured correctly
- [ ] **Environment variables** - All secrets are set
- [ ] **Database connection** - MongoDB is connected
- [ ] **Cloudinary** - Images upload successfully
- [ ] **Monitoring** - Set up error tracking (Sentry, etc.)

---

## Troubleshooting

### Common Issues

**1. CORS Errors**
- Ensure `FRONTEND_URL` in backend matches your actual frontend URL
- Check CORS configuration in `backend/src/index.js`

**2. Flask Service Not Responding**
- Verify `FLASK_SERVICE_URL` in backend matches Flask service URL
- Check `FLASK_SERVICE_SECRET` matches in both services
- Ensure Flask service is running and accessible

**3. MongoDB Connection Failed**
- Verify `MONGODB_URI` is correct
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

**4. Cloudinary Upload Fails**
- Verify all Cloudinary credentials are correct
- Check upload preset is configured correctly
- Verify file size limits

**5. Environment Variables Not Loading**
- Ensure `.env` files are in correct directories
- For Vercel/Railway: Check environment variables in dashboard
- Restart services after changing environment variables

**6. Build Failures**
- Check Node.js/Python versions match requirements
- Verify all dependencies are in `package.json`/`requirements.txt`
- Check build logs for specific errors

**7. Port Conflicts**
- Ensure ports are not already in use
- For Railway/Render: Use `$PORT` environment variable
- Check firewall settings

### Getting Help

- Check application logs:
  - Railway: Dashboard → Service → Logs
  - Vercel: Dashboard → Deployment → Logs
  - VPS: `pm2 logs` or `docker compose logs`

- Test endpoints manually:
  ```bash
  curl https://your-backend.com/api/health
  curl https://your-flask.com/health
  ```

---

## Cost Estimates

### Free Tier Options
- **Vercel**: Free tier (hobby) - Perfect for frontend
- **Railway**: $5/month free credit
- **Render**: Free tier available (with limitations)
- **MongoDB Atlas**: Free M0 cluster (512MB storage)
- **Cloudinary**: Free tier (25GB storage, 25GB bandwidth)

### Paid Options (Production)
- **VPS**: $12-40/month (DigitalOcean, Linode)
- **MongoDB Atlas**: $9/month (M10 cluster)
- **Railway**: ~$20/month for both backends
- **Cloudinary**: Pay-as-you-go after free tier

---

## Security Best Practices

1. **Use HTTPS everywhere** - SSL certificates for all services
2. **Environment variables** - Never commit secrets to Git
3. **Rate limiting** - Already configured in your code
4. **Input validation** - Already implemented
5. **Security headers** - Helmet.js is configured
6. **Database security** - Use strong passwords, restrict IP access
7. **Regular updates** - Keep dependencies updated
8. **Monitoring** - Set up error tracking and alerts

---

## Next Steps

After successful deployment:

1. **Set up monitoring** - Use services like Sentry, LogRocket
2. **Configure backups** - MongoDB Atlas has automatic backups
3. **Set up CI/CD** - Automate deployments from GitHub
4. **Performance optimization** - Monitor and optimize as needed
5. **Scale as needed** - Add more resources as traffic grows

---

**Need help?** Check the main [README.md](README.md) for more information or open an issue on GitHub.

