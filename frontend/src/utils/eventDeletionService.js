/**
 * Comprehensive Event Deletion Service
 * Handles complete cleanup of event data including:
 * - Firestore documents (events, photos, userJoinedEvents)
 * - Cloudinary images
 * - FAISS indices
 * - Face recognition cache
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';

export class EventDeletionService {
  constructor(db) {
    this.db = db;
    this.FLASK_API_BASE = 'http://localhost:5000/api';
  }

  /**
   * Delete an event and all associated data
   * @param {string} eventId - The event ID to delete
   * @param {string} eventPasscode - The event passcode (for backward compatibility)
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} - Deletion results
   */
  async deleteEvent(eventId, eventPasscode = null, options = {}) {
    const results = {
      success: false,
      deleted: {
        events: 0,
        photos: 0,
        joins: 0,
        cloudinaryImages: 0,
        faissIndex: false,
        faceCache: false
      },
      errors: []
    };

    try {
      console.log(`🗑️ Starting comprehensive deletion for event: ${eventId}`);

      // Step 1: Delete user join mappings
      console.log('📋 Deleting user join mappings...');
      const joinsResult = await this._deleteUserJoins(eventId);
      results.deleted.joins = joinsResult.count;
      if (joinsResult.error) results.errors.push(joinsResult.error);

      // Step 2: Delete photos and collect Cloudinary IDs
      console.log('📸 Deleting photos and collecting Cloudinary IDs...');
      const photosResult = await this._deletePhotos(eventId, eventPasscode);
      results.deleted.photos = photosResult.count;
      if (photosResult.error) results.errors.push(photosResult.error);

      // Step 3: Clean up Cloudinary images
      if (photosResult.cloudinaryIds.length > 0) {
        console.log(`☁️ Cleaning up ${photosResult.cloudinaryIds.length} Cloudinary images...`);
        const cloudinaryResult = await this._deleteCloudinaryImages(photosResult.cloudinaryIds);
        results.deleted.cloudinaryImages = cloudinaryResult.count;
        if (cloudinaryResult.error) results.errors.push(cloudinaryResult.error);
      }

      // Step 4: Clear FAISS indices and face recognition cache
      console.log('🧠 Clearing FAISS indices and face recognition cache...');
      const cacheResult = await this._clearEventCache(eventId);
      results.deleted.faissIndex = cacheResult.faissCleared;
      results.deleted.faceCache = cacheResult.faceCacheCleared;
      if (cacheResult.error) results.errors.push(cacheResult.error);

      // Step 5: Delete the event document
      console.log('📄 Deleting event document...');
      const eventResult = await this._deleteEventDocument(eventId);
      results.deleted.events = eventResult.count;
      if (eventResult.error) results.errors.push(eventResult.error);

      results.success = true;
      console.log('✅ Event deletion completed successfully');
      
      return results;

    } catch (error) {
      console.error('❌ Event deletion failed:', error);
      results.errors.push(`Critical error: ${error.message}`);
      return results;
    }
  }

  /**
   * Delete user join mappings for an event
   */
  async _deleteUserJoins(eventId) {
    try {
      const joinsQ = query(collection(this.db, 'userJoinedEvents'), where('eventId', '==', eventId));
      const snapJoins = await getDocs(joinsQ);
      
      if (snapJoins.empty) {
        return { count: 0 };
      }

      const batch = writeBatch(this.db);
      snapJoins.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      return { count: snapJoins.docs.length };
    } catch (error) {
      return { count: 0, error: `Failed to delete user joins: ${error.message}` };
    }
  }

  /**
   * Delete photos and collect Cloudinary public IDs
   */
  async _deletePhotos(eventId, eventPasscode) {
    try {
      let photosQ = query(collection(this.db, 'photos'), where('event_id', '==', eventId));
      let photosSnap = await getDocs(photosQ);
      
      // If no photos by event_id, try by passcode for backward compatibility
      if (photosSnap.empty && eventPasscode) {
        photosQ = query(collection(this.db, 'photos'), where('project_passcode', '==', eventPasscode));
        photosSnap = await getDocs(photosQ);
      }
      
      if (photosSnap.empty) {
        return { count: 0, cloudinaryIds: [] };
      }

      // Collect Cloudinary public IDs
      const cloudinaryIds = [];
      photosSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.cloudinaryPublicId) {
          cloudinaryIds.push(data.cloudinaryPublicId);
        }
      });

      // Delete photos from Firestore
      const batch = writeBatch(this.db);
      photosSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      return { count: photosSnap.docs.length, cloudinaryIds };
    } catch (error) {
      return { count: 0, cloudinaryIds: [], error: `Failed to delete photos: ${error.message}` };
    }
  }

  /**
   * Delete images from Cloudinary using Flask backend
   */
  async _deleteCloudinaryImages(cloudinaryIds) {
    try {
      if (cloudinaryIds.length === 0) {
        return { count: 0 };
      }

      console.log(`🗑️ Deleting ${cloudinaryIds.length} Cloudinary images via Flask backend...`);

      // Use Flask backend for Cloudinary deletion
      const response = await fetch(`${this.FLASK_API_BASE}/v2/delete-cloudinary-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_ids: cloudinaryIds
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Cloudinary deletion successful: ${result.deleted_count} images deleted`);
        return { count: result.deleted_count || cloudinaryIds.length };
      } else {
        const errorData = await response.json();
        console.error('❌ Cloudinary deletion failed:', errorData);
        
        // Check for specific error types
        if (errorData.message && errorData.message.includes('credentials not configured')) {
          return { 
            count: 0, 
            error: `Cloudinary deletion failed: Server not configured. Please contact administrator to set up Cloudinary credentials.` 
          };
        }
        
        return { 
          count: 0, 
          error: `Cloudinary deletion failed: ${errorData.message || 'Unknown error'}` 
        };
      }
    } catch (error) {
      console.error('❌ Cloudinary deletion error:', error);
      return { 
        count: 0, 
        error: `Failed to delete Cloudinary images: ${error.message}` 
      };
    }
  }

  /**
   * Clear FAISS indices and face recognition cache
   */
  async _clearEventCache(eventId) {
    try {
      const response = await fetch(`${this.FLASK_API_BASE}/v2/clear-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          faissCleared: result.faiss_cleared || false,
          faceCacheCleared: true
        };
      } else {
        return {
          faissCleared: false,
          faceCacheCleared: false,
          error: `Flask API error: ${response.status}`
        };
      }
    } catch (error) {
      return {
        faissCleared: false,
        faceCacheCleared: false,
        error: `Failed to clear cache: ${error.message}`
      };
    }
  }

  /**
   * Delete the event document
   */
  async _deleteEventDocument(eventId) {
    try {
      await deleteDoc(doc(this.db, 'events', eventId));
      return { count: 1 };
    } catch (error) {
      return { count: 0, error: `Failed to delete event document: ${error.message}` };
    }
  }
}

// Export function to create service instance with db
export const createEventDeletionService = (db) => new EventDeletionService(db);
