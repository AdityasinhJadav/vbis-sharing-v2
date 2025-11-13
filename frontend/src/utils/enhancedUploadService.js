/**
 * Enhanced Upload Service with Parallel Processing, Pause/Resume, and Background Processing
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { flaskFaceService } from './flaskFaceApi';

export class EnhancedUploadService {
  constructor() {
    this.uploadQueue = [];
    this.isPaused = false;
    this.isUploading = false;
    this.uploadProgress = {};
    this.uploadResults = [];
    this.eventListeners = {};
  }

  /**
   * Add event listener for upload events
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Smart image compression with quality optimization
   */
  async smartCompress(file, maxSizeMB = 2, quality = 0.7) {
    const maxSize = maxSizeMB * 1024 * 1024;
    
    // If file is already small enough, return as-is
    if (file.size <= maxSize) {
      return file;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate optimal dimensions
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        // Calculate compression ratio needed
        const currentSizeMB = file.size / (1024 * 1024);
        const _compressionRatio = Math.sqrt(maxSizeMB / currentSizeMB);
        
        // Apply compression
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw with compression
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels to meet size target
        const tryCompress = (q) => {
          canvas.toBlob((blob) => {
            if (blob.size <= maxSize || q <= 0.3) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              tryCompress(q - 0.1);
            }
          }, 'image/jpeg', q);
        };
        
        tryCompress(quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload single file with progress tracking
   */
  async uploadSingleFile(file, options, onProgress) {
    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Update progress: compression
      onProgress({ fileId, stage: 'compressing', progress: 0 });
      
      // Smart compression
      const compressedFile = await this.smartCompress(file);
      
      onProgress({ fileId, stage: 'uploading', progress: 0 });
      
      // Upload to Cloudinary with progress tracking
      const cloudinaryResponse = await this.uploadWithProgress(compressedFile, options, (progress) => {
        onProgress({ fileId, stage: 'uploading', progress });
      });
      
      onProgress({ fileId, stage: 'saving', progress: 0 });
      
      // Save to Firestore
      const photoDoc = await addDoc(collection(db, 'photos'), {
        cloudinaryPublicId: cloudinaryResponse.public_id,
        cloudinaryUrl: cloudinaryResponse.secure_url,
        originalName: file.name,
        project_passcode: options.passcode,
        event_id: options.eventId,
        eventName: options.eventName || 'Unknown Event',
        uploadedBy: options.uploadedBy,
        uploadedByUid: options.uploadedByUid,
        uploadedAt: serverTimestamp(),
        fileSize: compressedFile.size,
        fileType: compressedFile.type,
        width: cloudinaryResponse.width,
        height: cloudinaryResponse.height,
      });
      
      onProgress({ fileId, stage: 'complete', progress: 100 });
      
      return {
        success: true,
        fileId,
        file,
        cloudinaryResponse,
        photoDocId: photoDoc.id,
        photoDoc,
        options  // Include options for face processing
      };
      
    } catch (error) {
      onProgress({ fileId, stage: 'error', progress: 0, error: error.message });
      return {
        success: false,
        fileId,
        file,
        error: error.message
      };
    }
  }

  /**
   * Upload with progress tracking using XMLHttpRequest
   */
  async uploadWithProgress(file, options, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      
      if (options.folder) {
        formData.append('folder', options.folder);
      }
      if (options.public_id) {
        formData.append('public_id', options.public_id);
      }
      if (options.tags) {
        formData.append('tags', options.tags.join(','));
      }

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('Upload failed'));
      
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`);
      xhr.send(formData);
    });
  }

  /**
   * Process faces in background (non-blocking)
   */
  async processFacesInBackground(uploadResults) {
    const successfulUploads = uploadResults.filter(r => r.success);
    
    this.emit('faceProcessingStarted', { count: successfulUploads.length });
    
    // Process faces in parallel (non-blocking)
    const faceProcessingPromises = successfulUploads.map(async (result, index) => {
      try {
        this.emit('faceProcessingProgress', { 
          index: index + 1, 
          total: successfulUploads.length,
          fileName: result.file.name 
        });
        
        console.log(`🔄 Ingesting photo ${index + 1}/${successfulUploads.length} into FAISS...`);
        console.log(`   Event ID: ${result.options.eventId}`);
        console.log(`   Photo ID: ${result.photoDocId}`);
        console.log(`   Image URL: ${result.cloudinaryResponse.secure_url}`);
        
        const ingestResult = await flaskFaceService.api.ingestPhoto(
          result.options.eventId,
          result.photoDocId,
          result.cloudinaryResponse.secure_url
        );
        
        console.log(`✅ Photo ${index + 1} ingestion result:`, ingestResult);
        
        this.emit('faceProcessingComplete', { 
          index: index + 1, 
          fileName: result.file.name 
        });
        
        return { success: true, result };
      } catch (error) {
        console.warn(`Face processing failed for ${result.file.name}:`, error);
        this.emit('faceProcessingError', { 
          index: index + 1, 
          fileName: result.file.name, 
          error: error.message 
        });
        return { success: false, result, error };
      }
    });
    
    // Don't wait for face processing to complete
    Promise.all(faceProcessingPromises).then((results) => {
      const successful = results.filter(r => r.success).length;
      this.emit('faceProcessingFinished', { 
        successful, 
        total: results.length 
      });
    });
  }

  /**
   * Upload multiple files with parallel processing and pause/resume
   */
  async uploadFiles(files, options) {
    if (this.isUploading) {
      throw new Error('Upload already in progress');
    }

    this.isUploading = true;
    this.isPaused = false;
    this.uploadQueue = files.map((file, index) => ({
      file,
      index,
      status: 'pending',
      progress: 0,
      result: null
    }));
    this.uploadResults = [];

    this.emit('uploadStarted', { totalFiles: files.length });

    try {
      // Process files in parallel with concurrency limit
      const CONCURRENCY_LIMIT = 3; // Upload 3 files at a time
      const results = [];
      
      for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
        // Check for pause
        while (this.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const batch = files.slice(i, i + CONCURRENCY_LIMIT);
        const batchPromises = batch.map(async (file, batchIndex) => {
          const globalIndex = i + batchIndex;
          const queueItem = this.uploadQueue[globalIndex];
          
          if (queueItem.status === 'completed') {
            return queueItem.result;
          }
          
          queueItem.status = 'uploading';
          
          const result = await this.uploadSingleFile(file, {
            ...options,
            public_id: `${options.eventId}_${Date.now()}_${globalIndex}`
          }, (progress) => {
            queueItem.progress = progress.progress;
            queueItem.stage = progress.stage;
            this.emit('fileProgress', { 
              index: globalIndex, 
              fileName: file.name, 
              progress: progress.progress,
              stage: progress.stage 
            });
          });
          
          queueItem.status = result.success ? 'completed' : 'failed';
          queueItem.result = result;
          
          return result;
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        this.uploadResults.push(...batchResults);
        
        this.emit('batchComplete', { 
          batchIndex: Math.floor(i / CONCURRENCY_LIMIT),
          totalBatches: Math.ceil(files.length / CONCURRENCY_LIMIT),
          results: batchResults 
        });
      }

      // Start background face processing
      this.processFacesInBackground(results);

      this.emit('uploadComplete', { 
        results, 
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length 
      });

      return results;

    } catch (error) {
      this.emit('uploadError', { error: error.message });
      throw error;
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Pause upload process
   */
  pause() {
    this.isPaused = true;
    this.emit('uploadPaused', {});
  }

  /**
   * Resume upload process
   */
  resume() {
    this.isPaused = false;
    this.emit('uploadResumed', {});
  }

  /**
   * Cancel upload process
   */
  cancel() {
    this.isPaused = true;
    this.isUploading = false;
    this.emit('uploadCancelled', {});
  }

  /**
   * Get current upload status
   */
  getStatus() {
    return {
      isUploading: this.isUploading,
      isPaused: this.isPaused,
      queue: this.uploadQueue,
      results: this.uploadResults
    };
  }
}

// Export singleton instance
export const enhancedUploadService = new EnhancedUploadService();
