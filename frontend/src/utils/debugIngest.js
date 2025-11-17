/**
 * Debug utility to check and fix photo ingestion
 */

import { flaskFaceService } from './flaskFaceApi';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Check if photos are ingested in FAISS index
 * @param {string} eventId - The event ID
 * @returns {Promise<object>} Debug information
 */
export const debugEventIngestion = async (eventId) => {
  console.log(`🔍 Debugging ingestion for event: ${eventId}`);
  
  try {
    // Get all photos for this event
    const photosQuery = query(collection(db, 'photos'), where('event_id', '==', eventId));
    const photosSnapshot = await getDocs(photosQuery);
    
    if (photosSnapshot.empty) {
      return {
        success: false,
        message: 'No photos found for this event',
        photos: [],
        ingested: 0,
        total: 0
      };
    }
    
    const photos = photosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`📸 Found ${photos.length} photos in Firebase`);
    
    // Try to get FAISS index status (this would require a new API endpoint)
    // For now, we'll just return the photos info
    return {
      success: true,
      message: `Found ${photos.length} photos in Firebase`,
      photos: photos.map(p => ({
        id: p.id,
        name: p.originalName,
        url: p.cloudinaryUrl,
        uploadedAt: p.uploadedAt
      })),
      ingested: 'unknown', // Would need API endpoint to check FAISS
      total: photos.length
    };
    
  } catch (error) {
    console.error('Error debugging ingestion:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      photos: [],
      ingested: 0,
      total: 0
    };
  }
};

/**
 * Force ingest all photos for an event
 * @param {string} eventId - The event ID
 * @returns {Promise<object>} Ingest results
 */
export const forceIngestEventPhotos = async (eventId) => {
  console.log(`🚀 Force ingesting photos for event: ${eventId}`);
  
  try {
    // Get all photos for this event
    const photosQuery = query(collection(db, 'photos'), where('event_id', '==', eventId));
    const photosSnapshot = await getDocs(photosQuery);
    
    if (photosSnapshot.empty) {
      return {
        success: false,
        message: 'No photos found for this event',
        results: []
      };
    }
    
    const photos = photosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`📸 Found ${photos.length} photos to ingest`);
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      console.log(`🔄 Ingesting photo ${i + 1}/${photos.length}: ${photo.originalName}`);
      
      try {
        const ingestResult = await flaskFaceService.api.ingestPhoto(
          eventId,
          photo.id,
          photo.cloudinaryUrl
        );
        
        if (ingestResult.success) {
          successCount++;
          console.log(`✅ Successfully ingested: ${photo.originalName}`);
          results.push({
            photoId: photo.id,
            name: photo.originalName,
            success: true,
            message: 'Ingested successfully'
          });
        } else {
          failCount++;
          console.log(`❌ Failed to ingest: ${photo.originalName} - ${ingestResult.message}`);
          results.push({
            photoId: photo.id,
            name: photo.originalName,
            success: false,
            message: ingestResult.message || 'Unknown error'
          });
        }
      } catch (error) {
        failCount++;
        console.error(`❌ Error ingesting ${photo.originalName}:`, error);
        results.push({
          photoId: photo.id,
          name: photo.originalName,
          success: false,
          message: error.message
        });
      }
      
      // Small delay to avoid overwhelming the service
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Force ingest completed: ${successCount} success, ${failCount} failed`);
    
    return {
      success: true,
      message: `Ingested ${successCount}/${photos.length} photos successfully`,
      results,
      summary: {
        total: photos.length,
        success: successCount,
        failed: failCount
      }
    };
    
  } catch (error) {
    console.error('Error in force ingest:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      results: []
    };
  }
};

/**
 * Test FAISS index by trying to match a dummy embedding
 * @param {string} eventId - The event ID
 * @returns {Promise<object>} Test results
 */
export const testFaissIndex = async (eventId) => {
  console.log(`🧪 Testing FAISS index for event: ${eventId}`);
  
  try {
    // Create a dummy embedding (512 dimensions of zeros)
    const dummyEmbedding = new Array(512).fill(0);
    
    const matchResult = await flaskFaceService.api.fastMatch(
      eventId,
      dummyEmbedding,
      5, // top_k
      0.1 // very low threshold
    );
    
    console.log('FAISS test result:', matchResult);
    
    return {
      success: true,
      message: `FAISS index test completed`,
      hasIndex: matchResult.success,
      indexSize: matchResult.matches ? matchResult.matches.length : 0,
      result: matchResult
    };
    
  } catch (error) {
    console.error('Error testing FAISS index:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      hasIndex: false,
      indexSize: 0
    };
  }
};

