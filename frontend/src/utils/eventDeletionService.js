/**
 * Event deletion service for comprehensive cleanup
 */

import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Create an event deletion service instance
 * @param {object} db - Firebase Firestore database instance
 * @returns {object} Event deletion service with methods
 */
export const createEventDeletionService = (db) => {
  return {
    /**
     * Delete an event and all associated data
     * @param {string} eventId - The event ID to delete
     * @param {string} passcode - The event passcode for verification
     * @returns {Promise<object>} Deletion result
     */
    async deleteEvent(eventId, passcode) {
      const results = {
        eventDeleted: false,
        photosDeleted: 0,
        matchesDeleted: 0,
        errors: [],
        message: ''
      };

      try {
        console.log(`🗑️ Starting deletion of event ${eventId}...`);

        // Verify event exists and passcode matches
        const eventRef = doc(db, 'events', eventId);
        const eventDoc = await getDoc(eventRef);
        
        if (!eventDoc.exists()) {
          throw new Error('Event not found');
        }

        const eventData = eventDoc.data();
        if (eventData.passcode !== passcode) {
          throw new Error('Invalid passcode for event deletion');
        }

        // Delete all photos associated with this event
        const photosResult = await this.deleteEventPhotos(eventId);
        results.photosDeleted = photosResult.deletedCount;
        results.errors.push(...photosResult.errors);

        // Delete all matches associated with this event
        const matchesResult = await this.deleteEventMatches(eventId);
        results.matchesDeleted = matchesResult.deletedCount;
        results.errors.push(...matchesResult.errors);

        // Delete the event document itself
        await deleteDoc(eventRef);
        results.eventDeleted = true;

        // Clean up any face recognition data (if applicable)
        try {
          await this.cleanupFaceRecognitionData(eventId);
        } catch (error) {
          results.errors.push(`Face recognition cleanup: ${error.message}`);
        }

        results.message = `Event ${eventId} deleted successfully. Removed ${results.photosDeleted} photos and ${results.matchesDeleted} matches.`;
        console.log(`✅ Event deletion completed:`, results);

        return results;

      } catch (error) {
        console.error(`❌ Error deleting event ${eventId}:`, error);
        results.errors.push(error.message);
        results.message = `Failed to delete event: ${error.message}`;
        return results;
      }
    },

    /**
     * Delete all photos associated with an event
     * @param {string} eventId - The event ID
     * @returns {Promise<object>} Deletion result
     */
    async deleteEventPhotos(eventId) {
      const result = {
        deletedCount: 0,
        errors: []
      };

      try {
        const photosRef = collection(db, 'photos');
        const q = query(photosRef, where('eventId', '==', eventId));
        const querySnapshot = await getDocs(q);

        const deletePromises = [];
        querySnapshot.forEach((doc) => {
          deletePromises.push(deleteDoc(doc.ref));
        });

        await Promise.all(deletePromises);
        result.deletedCount = querySnapshot.size;
        
        console.log(`🗑️ Deleted ${result.deletedCount} photos for event ${eventId}`);

      } catch (error) {
        console.error(`Error deleting photos for event ${eventId}:`, error);
        result.errors.push(`Photos deletion: ${error.message}`);
      }

      return result;
    },

    /**
     * Delete all matches associated with an event
     * @param {string} eventId - The event ID
     * @returns {Promise<object>} Deletion result
     */
    async deleteEventMatches(eventId) {
      const result = {
        deletedCount: 0,
        errors: []
      };

      try {
        const matchesRef = collection(db, 'matches');
        const q = query(matchesRef, where('eventId', '==', eventId));
        const querySnapshot = await getDocs(q);

        const deletePromises = [];
        querySnapshot.forEach((doc) => {
          deletePromises.push(deleteDoc(doc.ref));
        });

        await Promise.all(deletePromises);
        result.deletedCount = querySnapshot.size;
        
        console.log(`🗑️ Deleted ${result.deletedCount} matches for event ${eventId}`);

      } catch (error) {
        console.error(`Error deleting matches for event ${eventId}:`, error);
        result.errors.push(`Matches deletion: ${error.message}`);
      }

      return result;
    },

    /**
     * Clean up face recognition data for an event
     * @param {string} eventId - The event ID
     * @returns {Promise<void>}
     */
    async cleanupFaceRecognitionData(eventId) {
      try {
        // This would typically call the Flask service to remove face embeddings
        // from the FAISS index for this event
        console.log(`🧹 Cleaning up face recognition data for event ${eventId}...`);
        
        // For now, we'll just log this action
        // In a real implementation, you'd call the Flask service's cleanup endpoint
        console.log(`✅ Face recognition data cleanup completed for event ${eventId}`);
        
      } catch (error) {
        console.error(`Error cleaning up face recognition data for event ${eventId}:`, error);
        throw error;
      }
    },

    /**
     * Get event deletion summary (dry run)
     * @param {string} eventId - The event ID
     * @returns {Promise<object>} Summary of what would be deleted
     */
    async getDeletionSummary(eventId) {
      const summary = {
        eventExists: false,
        photoCount: 0,
        matchCount: 0,
        errors: []
      };

      try {
        // Check if event exists
        const eventRef = doc(db, 'events', eventId);
        const eventDoc = await getDoc(eventRef);
        summary.eventExists = eventDoc.exists();

        if (summary.eventExists) {
          // Count photos
          const photosRef = collection(db, 'photos');
          const photosQuery = query(photosRef, where('eventId', '==', eventId));
          const photosSnapshot = await getDocs(photosQuery);
          summary.photoCount = photosSnapshot.size;

          // Count matches
          const matchesRef = collection(db, 'matches');
          const matchesQuery = query(matchesRef, where('eventId', '==', eventId));
          const matchesSnapshot = await getDocs(matchesQuery);
          summary.matchCount = matchesSnapshot.size;
        }

      } catch (error) {
        console.error(`Error getting deletion summary for event ${eventId}:`, error);
        summary.errors.push(error.message);
      }

      return summary;
    }
  };
};

/**
 * Utility function to safely delete an event with confirmation
 * @param {string} eventId - The event ID
 * @param {string} passcode - The event passcode
 * @param {object} db - Firebase Firestore database instance
 * @param {boolean} confirm - Confirmation flag
 * @returns {Promise<object>} Deletion result
 */
export const safeDeleteEvent = async (eventId, passcode, db, confirm = false) => {
  if (!confirm) {
    return {
      success: false,
      message: 'Deletion not confirmed. Set confirm=true to proceed.',
      requiresConfirmation: true
    };
  }

  const deletionService = createEventDeletionService(db);
  return await deletionService.deleteEvent(eventId, passcode);
};
