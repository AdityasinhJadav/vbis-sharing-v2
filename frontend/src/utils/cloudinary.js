// Browser-compatible Cloudinary upload function
export const uploadToCloudinary = async (file, options = {}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    
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

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Upload failed: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
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
