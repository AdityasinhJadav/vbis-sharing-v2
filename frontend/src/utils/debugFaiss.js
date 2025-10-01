// Debug FAISS index for an event
const debugFaissIndex = async (eventId) => {
  console.log(`🔍 Debugging FAISS index for event: ${eventId}`);
  
  try {
    // Check if the event has photos in Firestore
    const { collection, query, getDocs, where } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    const photosQuery = query(collection(db, 'photos'), where('event_id', '==', eventId));
    const photosSnapshot = await getDocs(photosQuery);
    
    if (photosSnapshot.empty) {
      console.log('❌ No photos found in Firestore for this event');
      return;
    }
    
    const photos = photosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`📸 Found ${photos.length} photos in Firestore`);
    
    // Try to ingest a few photos to test
    console.log('🔄 Testing ingest for first 3 photos...');
    
    for (let i = 0; i < Math.min(3, photos.length); i++) {
      const photo = photos[i];
      try {
        console.log(`  🔄 Ingesting: ${photo.originalName}`);
        
        const response = await fetch('http://localhost:5000/api/v2/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            photo_id: photo.id,
            image_url: photo.cloudinaryUrl
          })
        });
        
        const result = await response.json();
        console.log(`  ${result.success ? '✅' : '❌'} ${photo.originalName}: ${result.success ? 'Success' : result.message}`);
      } catch (error) {
        console.log(`  ❌ ${photo.originalName}: ${error.message}`);
      }
    }
    
    // Test match with dummy embedding
    console.log('🧪 Testing match with dummy embedding...');
    const dummyEmbedding = new Array(512).fill(0.1);
    
    try {
      const matchResponse = await fetch('http://localhost:5000/api/v2/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          user_embedding: dummyEmbedding,
          top_k: 5,
          threshold: 0.1
        })
      });
      
      const matchResult = await matchResponse.json();
      console.log('🎯 Match test result:', matchResult);
    } catch (error) {
      console.log('❌ Match test failed:', error.message);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
};

// Make it available globally
window.debugFaissIndex = debugFaissIndex;

console.log(`
🔧 FAISS Debug Helper Ready!

To debug a specific event:
debugFaissIndex('YOUR_EVENT_ID')

Example:
debugFaissIndex('Hnv5xnA57r2DrtIQzUHF')
`);

export { debugFaissIndex };
