// Quick bulk ingest script - run this in browser console
// This will ingest all existing photos into FAISS

const quickBulkIngest = async () => {
  console.log('🚀 Starting quick bulk ingest...');
  
  try {
    // Import Firebase
    const { collection, query, getDocs, where } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    // Get all events
    const eventsQuery = query(collection(db, 'events'));
    const eventsSnapshot = await getDocs(eventsQuery);
    
    if (eventsSnapshot.empty) {
      console.log('❌ No events found');
      return;
    }
    
    const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`📦 Found ${events.length} events`);
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    for (const event of events) {
      console.log(`\n🔄 Processing event: ${event.eventName} (${event.passcode})`);
      
      // Get photos for this event
      const photosQuery = query(collection(db, 'photos'), where('event_id', '==', event.id));
      const photosSnapshot = await getDocs(photosQuery);
      
      if (photosSnapshot.empty) {
        console.log(`  ⚠️ No photos found for event ${event.eventName}`);
        continue;
      }
      
      const photos = photosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`  📸 Found ${photos.length} photos`);
      
      let eventSuccess = 0;
      let eventFailed = 0;
      
      for (const photo of photos) {
        try {
          console.log(`    🔄 Ingesting: ${photo.originalName}`);
          
            const response = await fetch('http://localhost:5000/api/v2/ingest', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                event_id: event.id,
                photo_id: photo.id,
                image_url: photo.cloudinaryUrl
              })
            });
          
          const result = await response.json();
          
          if (result.success) {
            eventSuccess++;
            totalSuccess++;
            console.log(`    ✅ ${photo.originalName}`);
          } else {
            eventFailed++;
            totalFailed++;
            console.log(`    ❌ ${photo.originalName} - ${result.message || 'Unknown error'}`);
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
    
    if (totalSuccess > 0) {
      console.log(`\n✅ ${totalSuccess} photos are now ready for face matching!`);
      console.log('🔄 Try face matching again - you should now get results!');
    }
    
    return { totalSuccess, totalFailed };
  } catch (error) {
    console.error('❌ Bulk ingest error:', error);
    throw error;
  }
};

// Make it available globally
window.quickBulkIngest = quickBulkIngest;

console.log(`
🔧 Quick Bulk Ingest Ready!

To ingest all existing photos, run:
quickBulkIngest()

This will process all events and photos, then you can try face matching again.
`);

export { quickBulkIngest };
