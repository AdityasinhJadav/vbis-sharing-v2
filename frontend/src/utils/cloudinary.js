// Browser-compatible Cloudinary upload function
export const uploadToCloudinary = async (file, options = {}) => {
  try {
    // Check if environment variables are set
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName) {
      throw new Error('Cloudinary cloud name not configured. Please set VITE_CLOUDINARY_CLOUD_NAME in your .env file.');
    }
    
    if (!uploadPreset) {
      throw new Error('Cloudinary upload preset not configured. Please set VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.');
    }
    
    console.log('Cloudinary config:', { cloudName, uploadPreset });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    
    // Add folder if specified
    if (options.folder) {
      formData.append('folder', options.folder);
    }
    
    // Add public_id if specified
    if (options.public_id) {
      formData.append('public_id', options.public_id);
    }
    
    // Add tags if specified
    if (options.tags) {
      formData.append('tags', options.tags.join(','));
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    console.log('Uploading to:', uploadUrl);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary API error:', errorData);
      
      if (errorData.error?.message?.includes('Upload preset not found')) {
        throw new Error(`Upload preset '${uploadPreset}' not found. Please check your Cloudinary dashboard and create an unsigned upload preset.`);
      }
      
      throw new Error(`Upload failed: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Upload successful:', data.public_id);
    return data;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Get optimized image URL
export const getOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width = 'auto',
    height = 'auto',
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options;

  return `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_${crop},q_${quality},f_${format}/${publicId}`;
};

// Get thumbnail URL
export const getThumbnailUrl = (publicId, size = 300) => {
  return getOptimizedImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    quality: '80'
  });
};

// Get full size URL
export const getFullSizeUrl = (publicId) => {
  return getOptimizedImageUrl(publicId, {
    width: 1920,
    height: 1080,
    crop: 'limit',
    quality: '90'
  });
};
