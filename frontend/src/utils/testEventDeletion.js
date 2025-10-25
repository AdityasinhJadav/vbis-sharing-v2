/**
 * Test script for event deletion functionality
 * This can be run in the browser console to test the deletion service
 */

import { createEventDeletionService } from './eventDeletionService';
import { db } from '../firebase';

export const testEventDeletion = async (eventId, eventPasscode = null) => {
  console.log('🧪 Testing event deletion functionality...');
  console.log(`Event ID: ${eventId}`);
  console.log(`Event Passcode: ${eventPasscode || 'N/A'}`);
  
  try {
    const eventDeletionService = createEventDeletionService(db);
    const results = await eventDeletionService.deleteEvent(eventId, eventPasscode);
    
    console.log('📊 Deletion Results:');
    console.log(`✅ Success: ${results.success}`);
    console.log(`📄 Events deleted: ${results.deleted.events}`);
    console.log(`📸 Photos deleted: ${results.deleted.photos}`);
    console.log(`👥 User joins deleted: ${results.deleted.joins}`);
    console.log(`☁️ Cloudinary images deleted: ${results.deleted.cloudinaryImages}`);
    console.log(`🧠 FAISS index cleared: ${results.deleted.faissIndex}`);
    console.log(`💾 Face cache cleared: ${results.deleted.faceCache}`);
    
    if (results.errors.length > 0) {
      console.log('⚠️ Errors encountered:');
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    return results;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
};

// Example usage:
// testEventDeletion('your-event-id-here', 'EVENT123');
