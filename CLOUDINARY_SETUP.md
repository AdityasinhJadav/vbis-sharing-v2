# Cloudinary Setup Guide

## Error: Invalid cloud_name

If you're seeing the error "Invalid cloud_name" or "Cloudinary configuration error", follow these steps:

### Step 1: Get Your Cloudinary Credentials

1. Go to https://cloudinary.com/console
2. Sign in to your account (or create a free account)
3. On the Dashboard, you'll see:
   - **Cloud name** (e.g., `your-cloud-name`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz`)

### Step 2: Update Your .env File

Open `backend/.env` and update these values:

```env
CLOUDINARY_CLOUD_NAME=your-actual-cloud-name
CLOUDINARY_API_KEY=your-actual-api-key
CLOUDINARY_API_SECRET=your-actual-api-secret
```

**Important:**
- Replace `your-actual-cloud-name` with your actual Cloud name from the dashboard
- Replace `your-actual-api-key` with your actual API Key
- Replace `your-actual-api-secret` with your actual API Secret
- Do NOT include quotes around the values
- Make sure there are no spaces before or after the `=` sign

### Step 3: Restart Your Backend Server

After updating the `.env` file:
1. Stop your backend server (Ctrl+C)
2. Start it again: `npm run dev` or `node src/index.js`
3. Check the console for "Cloudinary connection successful" message

### Step 4: Verify

Try uploading a photo again. If you still get errors:
- Check that the `.env` file is in the `backend/` folder
- Verify there are no typos in the variable names
- Make sure you copied the exact values from Cloudinary dashboard
- Restart the server after making changes

### Common Issues

1. **"Invalid cloud_name"**: The cloud name doesn't exist or is incorrect
2. **"Unauthorized"**: API key or secret is wrong
3. **"Configuration incomplete"**: One or more environment variables are missing

### Need Help?

- Cloudinary Documentation: https://cloudinary.com/documentation
- Cloudinary Support: https://support.cloudinary.com


