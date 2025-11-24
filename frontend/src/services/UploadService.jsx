import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { uploadRoomPhotos } from '../api';

const UploadServiceContext = createContext();

export const useUploadService = () => {
  const context = useContext(UploadServiceContext);
  if (!context) {
    throw new Error('useUploadService must be used within UploadServiceProvider');
  }
  return context;
};

export const UploadServiceProvider = ({ children }) => {
  const [activeUploads, setActiveUploads] = useState(new Map());
  const uploadCallbacksRef = useRef(new Map());
  const abortControllersRef = useRef(new Map());

  const startUpload = useCallback(async (roomId, files, onProgress, onComplete, onError) => {
    const uploadId = `${roomId}-${Date.now()}`;
    
    console.log('📤 [Upload Service] Starting upload:', {
      uploadId,
      roomId,
      totalFiles: files.length,
      fileNames: files.map(f => f.name),
      fileSizes: files.map(f => `${(f.size / 1024 / 1024).toFixed(2)}MB`)
    });
    
    // Create AbortController for cancellation
    const abortController = new AbortController();
    abortControllersRef.current.set(uploadId, abortController);
    
    // Initialize upload state
    const uploadState = {
      id: uploadId,
      roomId,
      totalFiles: files.length,
      uploadedFiles: 0,
      failedFiles: 0,
      status: 'uploading', // 'uploading', 'completed', 'failed', 'cancelled'
      progress: 0,
      files: files.map((f, index) => ({
        index,
        name: f.name,
        size: f.size,
        status: 'pending' // 'pending', 'uploading', 'completed', 'failed'
      }))
    };

    // Store callbacks
    uploadCallbacksRef.current.set(uploadId, { onProgress, onComplete, onError });

    setActiveUploads(prev => {
      const newMap = new Map(prev);
      newMap.set(uploadId, uploadState);
      return newMap;
    });

    // Note: updateProgress removed - we update state directly in completion handler
    // to avoid state updates during render phase

    try {
      console.log('📡 [Upload Service] Sending files to backend...', {
        uploadId,
        roomId,
        fileCount: files.length
      });
      
      // Show initial progress (0%)
      const callbacks = uploadCallbacksRef.current.get(uploadId);
      if (callbacks?.onProgress) {
        queueMicrotask(() => {
          callbacks.onProgress({
            uploaded: 0,
            total: files.length,
            failed: 0,
            progress: 0
          });
        });
      }
      
      // Upload files one by one to track real progress
      console.log('⏳ [Upload Service] Starting upload to Cloudinary...', {
        uploadId,
        totalFiles: files.length
      });
      
      const startTime = Date.now();
      let uploadedCount = 0;
      let failedCount = 0;
      
      // Upload files in batches to avoid rate limiting while still tracking progress
      const BATCH_SIZE = 5; // Upload 5 files at a time
      const RETRY_DELAY = 2000; // 2 seconds delay for retries
      
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        // Check if upload was cancelled
        if (abortController.signal.aborted) {
          console.log('🚫 [Upload Service] Upload cancelled during file upload');
          throw new Error('Upload cancelled');
        }
        
        const batch = files.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(files.length / BATCH_SIZE);
        
        console.log(`📤 [Upload Service] Uploading batch ${batchNumber}/${totalBatches} (${batch.length} files)`);
        
        // Upload batch
        let retries = 0;
        const MAX_RETRIES = 3;
        let batchSuccess = false;
        
        while (!batchSuccess && retries < MAX_RETRIES) {
          try {
            // Upload batch of files
            const result = await uploadRoomPhotos(roomId, batch, abortController.signal);
            
            if (result.added > 0) {
              uploadedCount += result.added;
              const progress = Math.round(((uploadedCount + failedCount) / files.length) * 100);
              
              console.log(`✅ [Upload Service] Batch ${batchNumber}/${totalBatches} uploaded:`, {
                uploaded: uploadedCount,
                total: files.length,
                progress: progress
              });
              
              // Update progress
              setActiveUploads(prev => {
                const newMap = new Map(prev);
                const current = newMap.get(uploadId);
                if (current) {
                  current.uploadedFiles = uploadedCount;
                  current.failedFiles = failedCount;
                  current.progress = progress;
                  newMap.set(uploadId, { ...current });
                }
                return newMap;
              });
              
              // Call progress callback
              if (callbacks?.onProgress) {
                queueMicrotask(() => {
                  callbacks.onProgress({
                    uploaded: uploadedCount,
                    total: files.length,
                    failed: failedCount,
                    progress: progress
                  });
                });
              }
              
              batchSuccess = true;
            } else {
              failedCount += batch.length;
              console.warn(`⚠️ [Upload Service] Batch ${batchNumber}/${totalBatches} failed to upload`);
              batchSuccess = true; // Don't retry if no files were added
            }
          } catch (error) {
            // Check if it's a rate limit error
            if (error.message.includes('Too many uploads') || error.message.includes('429')) {
              retries++;
              if (retries < MAX_RETRIES) {
                const delay = RETRY_DELAY * retries; // Exponential backoff
                console.log(`⏳ [Upload Service] Rate limited, retrying batch ${batchNumber} in ${delay}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue; // Retry the batch
              } else {
                // Max retries reached, mark batch as failed
                failedCount += batch.length;
                console.error(`❌ [Upload Service] Batch ${batchNumber}/${totalBatches} failed after ${MAX_RETRIES} retries:`, error.message);
                
                // Update progress
                const progress = Math.round(((uploadedCount + failedCount) / files.length) * 100);
                if (callbacks?.onProgress) {
                  queueMicrotask(() => {
                    callbacks.onProgress({
                      uploaded: uploadedCount,
                      total: files.length,
                      failed: failedCount,
                      progress: progress
                    });
                  });
                }
                batchSuccess = true; // Move to next batch
              }
            } else {
              // Other error, don't retry
              failedCount += batch.length;
              console.error(`❌ [Upload Service] Batch ${batchNumber}/${totalBatches} error:`, {
                error: error.message
              });
              
              // Update progress
              const progress = Math.round(((uploadedCount + failedCount) / files.length) * 100);
              if (callbacks?.onProgress) {
                queueMicrotask(() => {
                  callbacks.onProgress({
                    uploaded: uploadedCount,
                    total: files.length,
                    failed: failedCount,
                    progress: progress
                  });
                });
              }
              batchSuccess = true; // Move to next batch
            }
          }
        }
        
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < files.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between batches
        }
      }
      
      // All files processed - final progress update to 100%
      const finalProgress = Math.round(((uploadedCount + failedCount) / files.length) * 100);
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log('✅ [Upload Service] All files processed:', {
        uploadId,
        uploaded: uploadedCount,
        failed: failedCount,
        total: files.length,
        progress: finalProgress,
        duration: `${totalTime}s`
      });
      
      // Mark all as completed
      setActiveUploads(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(uploadId);
        if (current) {
          current.status = 'completed';
          current.uploadedFiles = uploadedCount;
          current.failedFiles = failedCount;
          current.progress = finalProgress;
          newMap.set(uploadId, { ...current });
        }
        return newMap;
      });

      // Final progress callback to 100%
      const finalCallbacks = uploadCallbacksRef.current.get(uploadId);
      if (finalCallbacks?.onProgress) {
        queueMicrotask(() => {
          finalCallbacks.onProgress({
            uploaded: uploadedCount,
            total: files.length,
            failed: failedCount,
            progress: finalProgress
          });
        });
      }

      // Prepare result for completion callback
      const result = {
        added: uploadedCount,
        total: files.length,
        failed: failedCount,
        processing: true // Face matching runs in background
      };
      
      console.log('📊 [Upload Service] Upload complete, preparing to call callbacks:', {
        uploadId,
        uploaded: uploadedCount,
        total: files.length,
        failed: failedCount,
        hasOnProgress: !!finalCallbacks?.onProgress,
        hasOnComplete: !!finalCallbacks?.onComplete
      });

      // Call completion callback
      setTimeout(() => {
        const completionCallbacks = uploadCallbacksRef.current.get(uploadId) || finalCallbacks;
        
        if (completionCallbacks?.onComplete) {
          console.log('🎉 [Upload Service] Calling completion callback:', {
            uploadId,
            uploaded: uploadedCount,
            total: files.length,
            failed: failedCount
          });
          try {
            completionCallbacks.onComplete(result);
            console.log('✅ [Upload Service] Completion callback executed successfully');
          } catch (error) {
            console.error('❌ [Upload Service] Error in completion callback:', error);
          }
        } else {
          console.warn('⚠️ [Upload Service] No completion callback found!', { 
            uploadId,
            finalCallbacksExist: !!finalCallbacks,
            completionCallbacksExist: !!completionCallbacks
          });
        }
        
        // Clean up callbacks and abort controller AFTER callbacks are called
        uploadCallbacksRef.current.delete(uploadId);
        abortControllersRef.current.delete(uploadId);
      }, 100);

      // Clean up after 5 seconds
      setTimeout(() => {
        setActiveUploads(prev => {
          const newMap = new Map(prev);
          newMap.delete(uploadId);
          return newMap;
        });
      }, 5000);

      return uploadId;
    } catch (error) {
      // Check if it was cancelled
      const wasCancelled = error.name === 'AbortError' || abortController.signal.aborted;
      
      console.log(wasCancelled ? '🚫 [Upload Service] Upload cancelled' : '❌ [Upload Service] Upload failed:', {
        uploadId,
        roomId,
        error: error.message,
        errorName: error.name,
        wasCancelled
      });
      
      setActiveUploads(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(uploadId);
        if (current) {
          current.status = wasCancelled ? 'cancelled' : 'failed';
          newMap.set(uploadId, { ...current });
        }
        return newMap;
      });

      // Call stored callback only if not cancelled - asynchronously to avoid render issues
      if (!wasCancelled) {
        queueMicrotask(() => {
          const callbacks = uploadCallbacksRef.current.get(uploadId);
          if (callbacks?.onError) {
            console.log('📞 [Upload Service] Calling error callback:', {
              uploadId,
              error: error.message
            });
            callbacks.onError(error);
          }
        });
      }
      
      // Clean up callbacks and abort controller
      uploadCallbacksRef.current.delete(uploadId);
      abortControllersRef.current.delete(uploadId);

      // Clean up failed uploads after 10 seconds
      setTimeout(() => {
        setActiveUploads(prev => {
          const newMap = new Map(prev);
          newMap.delete(uploadId);
          return newMap;
        });
      }, 10000);

      throw error;
    }
  }, []);

  const getUpload = useCallback((uploadId) => {
    return activeUploads.get(uploadId);
  }, [activeUploads]);

  const getAllUploads = useCallback(() => {
    return Array.from(activeUploads.values());
  }, [activeUploads]);

  const getUploadsByRoom = useCallback((roomId) => {
    return Array.from(activeUploads.values()).filter(upload => upload.roomId === roomId);
  }, [activeUploads]);

  const attachCallbacks = useCallback((uploadId, onProgress, onComplete, onError) => {
    uploadCallbacksRef.current.set(uploadId, { onProgress, onComplete, onError });
  }, []);

  const cancelUpload = useCallback((uploadId) => {
    const abortController = abortControllersRef.current.get(uploadId);
    if (abortController) {
      abortController.abort();
    }
    
    setActiveUploads(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(uploadId);
      if (current) {
        current.status = 'cancelled';
        newMap.set(uploadId, { ...current });
      }
      return newMap;
    });
    
    // Clean up callbacks and abort controller
    uploadCallbacksRef.current.delete(uploadId);
    abortControllersRef.current.delete(uploadId);
    
    // Clean up after 3 seconds
    setTimeout(() => {
      setActiveUploads(prev => {
        const newMap = new Map(prev);
        newMap.delete(uploadId);
        return newMap;
      });
    }, 3000);
  }, []);

  const clearUpload = useCallback((uploadId) => {
    setActiveUploads(prev => {
      const newMap = new Map(prev);
      newMap.delete(uploadId);
      return newMap;
    });
    uploadCallbacksRef.current.delete(uploadId);
    abortControllersRef.current.delete(uploadId);
  }, []);

  return (
    <UploadServiceContext.Provider
      value={{
        startUpload,
        getUpload,
        getAllUploads,
        getUploadsByRoom,
        attachCallbacks,
        cancelUpload,
        clearUpload,
        activeUploadsCount: activeUploads.size
      }}
    >
      {children}
    </UploadServiceContext.Provider>
  );
};

