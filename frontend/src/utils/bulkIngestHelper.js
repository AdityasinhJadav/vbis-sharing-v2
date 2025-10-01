// Bulk ingest helper for existing photos
// Run this in browser console to ingest existing photos into FAISS

export const bulkIngestAllEvents = async () => {
  console.log('🚀 Starting bulk ingest for all events...');
  
  try {
    // Get all events
    const { collection, query, getDocs } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    const eventsQuery = query(collection(db, 'events'));
    const eventsSnapshot = await getDocs(eventsQuery);
    
    if (eventsSnapshot.empty) {
      console.log('No events found');
      return;
    }
    
    const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Found ${events.length} events`);
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    for (const event of events) {
      console.log(`\n📦 Processing event: ${event.eventName} (${event.passcode})`);
      
      // Get photos for this event
      const photosQuery = query(collection(db, 'photos'), where('event_id', '==', event.id));
      const photosSnapshot = await getDocs(photosQuery);
      
      if (photosSnapshot.empty) {
        console.log(`  No photos found for event ${event.eventName}`);
        continue;
      }
      
      const photos = photosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`  Found ${photos.length} photos`);
      
      let eventSuccess = 0;
      let eventFailed = 0;
      
      for (const photo of photos) {
        try {
          // Import flaskFaceService dynamically
          const { flaskFaceService } = await import('./flaskFaceApi');
          
          const ingestResult = await flaskFaceService.api.ingestPhoto(
            event.id,
            photo.id,
            photo.cloudinaryUrl
          );
          
          if (ingestResult.success) {
            eventSuccess++;
            totalSuccess++;
            console.log(`    ✅ ${photo.originalName}`);
          } else {
            eventFailed++;
            totalFailed++;
            console.log(`    ❌ ${photo.originalName} - ${ingestResult.message || 'Unknown error'}`);
          }
        } catch (error) {
          eventFailed++;
          totalFailed++;
          console.log(`    ❌ ${photo.originalName} - ${error.message}`);
        }
      }
      
      console.log(`  📊 Event ${event.eventName}: ${eventSuccess} success, ${eventFailed} failed`);
    }
    
    console.log(`\n🎉 Bulk ingest completed!`);
    console.log(`📊 Total: ${totalSuccess} success, ${totalFailed} failed`);
    
    return { totalSuccess, totalFailed };
  } catch (error) {
    console.error('Bulk ingest error:', error);
    throw error;
  }
};

// Helper to ingest a specific event
export const bulkIngestEvent = async (eventId) => {
  console.log(`🔄 Starting bulk ingest for event ${eventId}...`);
  
  try {
    const { collection, query, getDocs } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    // Get photos for this event
    const photosQuery = query(collection(db, 'photos'), where('event_id', '==', eventId));
    const photosSnapshot = await getDocs(photosQuery);
    
    if (photosSnapshot.empty) {
      console.log('No photos found for this event');
      return;
    }
    
    const photos = photosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Found ${photos.length} photos to ingest`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const photo of photos) {
      try {
        const { flaskFaceService } = await import('./flaskFaceApi');
        
        const ingestResult = await flaskFaceService.api.ingestPhoto(
          eventId,
          photo.id,
          photo.cloudinaryUrl
        );
        
        if (ingestResult.success) {
          successCount++;
          console.log(`✅ ${photo.originalName}`);
        } else {
          failCount++;
          console.log(`❌ ${photo.originalName} - ${ingestResult.message || 'Unknown error'}`);
        }
      } catch (error) {
        failCount++;
        console.log(`❌ ${photo.originalName} - ${error.message}`);
      }
    }
    
    console.log(`🎉 Event ingest completed: ${successCount} success, ${failCount} failed`);
    return { success: successCount, failed: failCount, total: photos.length };
  } catch (error) {
    console.error('Event ingest error:', error);
    throw error;
  }
};

// Usage instructions
console.log(`
🔧 Bulk Ingest Helper Commands:

1. Ingest all events:
   bulkIngestAllEvents()

2. Ingest specific event:
   bulkIngestEvent('EVENT_ID_HERE')

3. Check if Flask backend is running:
   fetch('http://localhost:5000/health').then(r => r.json()).then(console.log)
`);
