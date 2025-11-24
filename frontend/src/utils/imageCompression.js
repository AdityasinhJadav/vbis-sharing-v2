/**
 * Client-side image compression utility
 * Compresses and resizes images to fit within size limits while maintaining quality
 */

/**
 * Compress an image file
 * @param {File} file - Original image file
 * @param {Object} options - Compression options
 * @param {number} options.maxSizeMB - Maximum file size in MB (default: 9MB to stay under 10MB limit)
 * @param {number} options.maxWidth - Maximum width in pixels (default: 1920)
 * @param {number} options.maxHeight - Maximum height in pixels (default: 1920)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.85)
 * @returns {Promise<File>} Compressed image file
 */
export async function compressImage(file, options = {}) {
  const {
    maxSizeMB = 9, // 9MB to stay safely under 10MB Cloudinary limit
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85
  } = options;

  // If file is already small enough, return as-is
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        // Resize if image is too large
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Draw image on canvas with better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // If still too large, reduce quality further
            if (blob.size > maxSizeMB * 1024 * 1024) {
              // Try with lower quality
              canvas.toBlob(
                (smallerBlob) => {
                  if (!smallerBlob) {
                    reject(new Error('Failed to compress image'));
                    return;
                  }
                  
                  // Create new file with compressed data
                  const compressedFile = new File(
                    [smallerBlob],
                    file.name,
                    {
                      type: file.type || 'image/jpeg',
                      lastModified: Date.now()
                    }
                  );
                  
                  console.log(`✅ Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                  resolve(compressedFile);
                },
                file.type || 'image/jpeg',
                Math.max(0.5, quality * 0.7) // Reduce quality by 30%
              );
            } else {
              // Create new file with compressed data
              const compressedFile = new File(
                [blob],
                file.name,
                {
                  type: file.type || 'image/jpeg',
                  lastModified: Date.now()
                }
              );
              
              console.log(`✅ Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
              resolve(compressedFile);
            }
          },
          file.type || 'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Compress multiple image files
 * @param {File[]} files - Array of image files
 * @param {Object} options - Compression options
 * @returns {Promise<File[]>} Array of compressed files
 */
export async function compressImages(files, options = {}) {
  const results = await Promise.allSettled(
    files.map(file => compressImage(file, options))
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.warn(`Failed to compress ${files[index].name}:`, result.reason);
      // Return original file if compression fails
      return files[index];
    }
  });
}

/**
 * Check if file needs compression
 * @param {File} file - Image file
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {boolean} True if file needs compression
 */
export function needsCompression(file, maxSizeMB = 10) {
  return file.size > maxSizeMB * 1024 * 1024;
}

