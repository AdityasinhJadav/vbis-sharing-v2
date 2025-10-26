/**
 * Image optimization utilities for better performance
 */

/**
 * Compress image before upload
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed image file
 */
export const compressImage = (file, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    maxSizeMB = 2
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas to blob conversion failed'));
          return;
        }

        // Check if compressed size is acceptable
        const compressedSizeMB = blob.size / (1024 * 1024);
        
        if (compressedSizeMB <= maxSizeMB) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        } else {
          // Try with lower quality
          canvas.toBlob((lowerQualityBlob) => {
            if (!lowerQualityBlob) {
              reject(new Error('Compression failed'));
              return;
            }
            
            const compressedFile = new File([lowerQualityBlob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }, 'image/jpeg', quality * 0.7);
        }
      }, 'image/jpeg', quality);
    };

    img.onerror = () => reject(new Error('Image loading failed'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Create thumbnail for image preview
 * @param {File} file - Image file
 * @param {number} size - Thumbnail size
 * @returns {Promise<string>} - Data URL of thumbnail
 */
export const createThumbnail = (file, size = 200) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate thumbnail dimensions
      const ratio = Math.min(size / img.width, size / img.height);
      const width = img.width * ratio;
      const height = img.height * ratio;

      canvas.width = width;
      canvas.height = height;

      // Draw thumbnail
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataURL = canvas.toDataURL('image/jpeg', 0.7);
      resolve(dataURL);
    };

    img.onerror = () => reject(new Error('Thumbnail creation failed'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Batch compress multiple images
 * @param {File[]} files - Array of image files
 * @param {Object} options - Compression options
 * @returns {Promise<File[]>} - Array of compressed files
 */
export const batchCompressImages = async (files, options = {}) => {
  const compressedFiles = [];
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const compressedFile = await compressImage(files[i], options);
      compressedFiles.push(compressedFile);
    } catch (error) {
      console.error(`Failed to compress file ${files[i].name}:`, error);
      errors.push({ file: files[i].name, error: error.message });
    }
  }

  if (errors.length > 0) {
    console.warn('Some files failed to compress:', errors);
  }

  return compressedFiles;
};

/**
 * Get image metadata
 * @param {File} file - Image file
 * @returns {Promise<Object>} - Image metadata
 */
export const getImageMetadata = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        fileSize: file.size,
        fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
        type: file.type,
        name: file.name
      });
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Validate image file
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
export const validateImageFile = (file, options = {}) => {
  const {
    maxSizeMB = 10,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxWidth = 4000,
    maxHeight = 4000
  } = options;

  const errors = [];

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    errors.push(`File too large. Maximum size: ${maxSizeMB}MB`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    fileSizeMB: fileSizeMB.toFixed(2)
  };
};

/**
 * Lazy load images with intersection observer
 * @param {string} selector - CSS selector for images
 * @param {Object} options - Intersection observer options
 */
export const setupLazyLoading = (selector = 'img[data-src]', options = {}) => {
  const {
    rootMargin = '50px',
    threshold = 0.1
  } = options;

  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      }
    });
  }, { rootMargin, threshold });

  // Observe all lazy images
  document.querySelectorAll(selector).forEach(img => {
    imageObserver.observe(img);
  });

  return imageObserver;
};
