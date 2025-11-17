/**
 * Quick bulk ingest utility for processing multiple photos
 */

import { flaskFaceService } from './flaskFaceApi';

/**
 * Perform quick bulk ingest of photos for face recognition
 * @param {Array} photos - Array of photo objects with id, url, eventId
 * @param {object} options - Options for bulk processing
 * @returns {Promise<object>} Result object with success/failure counts
 */
export const quickBulkIngest = async (photos = [], options = {}) => {
  const {
    batchSize = 5,
    delayBetweenBatches = 1000,
    onProgress = null,
    onError = null
  } = options;

  let totalSuccess = 0;
  let totalFailed = 0;
  const errors = [];

  try {
    console.log(`🚀 Starting bulk ingest for ${photos.length} photos...`);

    // If no photos provided, try to get photos from current context
    if (photos.length === 0) {
      console.log('📸 No photos provided, attempting to discover photos...');
      // This would typically fetch photos from the current event/room
      // For now, return empty result
      return {
        totalSuccess: 0,
        totalFailed: 0,
        errors: ['No photos provided for bulk ingest'],
        message: 'No photos to process'
      };
    }

    // Process photos in batches
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(photos.length / batchSize)}`);

      // Process batch concurrently
      const batchPromises = batch.map(async (photo) => {
        try {
          const result = await processPhoto(photo);
          if (result.success) {
            totalSuccess++;
            console.log(`✅ Processed photo ${photo.id || photo.url}`);
          } else {
            totalFailed++;
            errors.push(`Photo ${photo.id || photo.url}: ${result.error}`);
            console.log(`❌ Failed to process photo ${photo.id || photo.url}: ${result.error}`);
          }
          return result;
        } catch (error) {
          totalFailed++;
          const errorMsg = `Photo ${photo.id || photo.url}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`❌ Error processing photo ${photo.id || photo.url}:`, error);
          
          if (onError) {
            onError(error, photo);
          }
          
          return { success: false, error: error.message };
        }
      });

      await Promise.all(batchPromises);

      // Report progress
      if (onProgress) {
        onProgress({
          processed: Math.min(i + batchSize, photos.length),
          total: photos.length,
          success: totalSuccess,
          failed: totalFailed
        });
      }

      // Delay between batches to avoid overwhelming the service
      if (i + batchSize < photos.length && delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    console.log(`🎉 Bulk ingest completed! Success: ${totalSuccess}, Failed: ${totalFailed}`);

    return {
      totalSuccess,
      totalFailed,
      errors,
      message: `Processed ${totalSuccess} photos successfully, ${totalFailed} failed`
    };

  } catch (error) {
    console.error('💥 Bulk ingest failed:', error);
    return {
      totalSuccess,
      totalFailed: totalFailed + 1,
      errors: [...errors, `Bulk ingest error: ${error.message}`],
      message: 'Bulk ingest failed due to unexpected error'
    };
  }
};

/**
 * Process a single photo for face recognition
 * @param {object} photo - Photo object with id, url, eventId
 * @returns {Promise<object>} Processing result
 */
const processPhoto = async (photo) => {
  try {
    if (!photo.url && !photo.imageData) {
      throw new Error('Photo must have either URL or image data');
    }

    // Use Flask face service to analyze the photo
    const analysisResult = await flaskFaceService.analyzeFaceFromUrl(photo.url || photo.imageData);
    
    if (!analysisResult.success) {
      throw new Error(analysisResult.message || 'Face analysis failed');
    }

    // If we have an event ID, ingest the photo into the event's index
    if (photo.eventId) {
      const ingestResult = await flaskFaceService.ingestPhoto({
        event_id: photo.eventId,
        photo_id: photo.id || `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        image_url: photo.url,
        embedding: analysisResult.embedding
      });

      if (!ingestResult.success) {
        throw new Error(ingestResult.message || 'Photo ingestion failed');
      }
    }

    return {
      success: true,
      photoId: photo.id,
      embedding: analysisResult.embedding,
      message: 'Photo processed successfully'
    };

  } catch (error) {
    return {
      success: false,
      photoId: photo.id,
      error: error.message
    };
  }
};

/**
 * Get photos from a specific event/room for bulk processing
 * @param {string} eventId - The event/room ID
 * @param {object} db - Firebase Firestore database instance
 * @returns {Promise<Array>} Array of photo objects
 */
export const getEventPhotos = async (eventId, db) => {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const photosRef = collection(db, 'photos');
    const q = query(photosRef, where('eventId', '==', eventId));
    const querySnapshot = await getDocs(q);
    
    const photos = [];
    querySnapshot.forEach((doc) => {
      photos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return photos;
  } catch (error) {
    console.error('Error fetching event photos:', error);
    return [];
  }
};

/**
 * Bulk ingest photos from a specific event
 * @param {string} eventId - The event/room ID
 * @param {object} db - Firebase Firestore database instance
 * @param {object} options - Processing options
 * @returns {Promise<object>} Processing result
 */
export const bulkIngestEventPhotos = async (eventId, db, options = {}) => {
  try {
    console.log(`🔍 Fetching photos for event ${eventId}...`);
    const photos = await getEventPhotos(eventId, db);
    
    if (photos.length === 0) {
      return {
        totalSuccess: 0,
        totalFailed: 0,
        errors: ['No photos found for this event'],
        message: 'No photos to process for this event'
      };
    }
    
    console.log(`📸 Found ${photos.length} photos for bulk processing`);
    return await quickBulkIngest(photos, options);
    
  } catch (error) {
    console.error('Error in bulk ingest event photos:', error);
    return {
      totalSuccess: 0,
      totalFailed: 1,
      errors: [`Event bulk ingest error: ${error.message}`],
      message: 'Failed to bulk ingest event photos'
    };
  }
};

