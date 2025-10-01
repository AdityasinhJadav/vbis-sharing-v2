// Debug V2 system - check FAISS index and test matching
const debugV2System = async () => {
  console.log('🔍 Debugging V2 system...');
  
  const eventId = 'Hnv5xnA57r2DrtIQzUHF';
  
  try {
    // Test 1: Check if we can get matches with a very low threshold
    console.log('🧪 Test 1: Match with very low threshold (0.01)...');
    
    // Create a more realistic dummy embedding
    const dummyEmbedding = [];
    for (let i = 0; i < 512; i++) {
      dummyEmbedding.push((Math.random() - 0.5) * 2);
    }
    // Normalize it
    const magnitude = Math.sqrt(dummyEmbedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = dummyEmbedding.map(val => val / magnitude);
    
    const response = await fetch('http://localhost:5000/api/v2/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          user_embedding: normalizedEmbedding,
          top_k: 10,
          threshold: 0.01  // Very low threshold to catch any matches
        })
    });
    
    const result = await response.json();
    console.log('📥 Match result:', result);
    
    if (result.success && result.matches && result.matches.length > 0) {
      console.log('✅ FAISS index has data! Found', result.matches.length, 'matches');
      console.log('📊 Matches:', result.matches);
    } else {
      console.log('❌ No matches found - FAISS index might be empty');
    }
    
    // Test 2: Try to ingest a photo manually
    console.log('\n🧪 Test 2: Manual photo ingestion...');
    
    // Get a photo from Firestore
    const { collection, query, getDocs, where } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    const photosQuery = query(collection(db, 'photos'), where('event_id', '==', eventId));
    const photosSnapshot = await getDocs(photosQuery);
    
    if (!photosSnapshot.empty) {
      const photo = photosSnapshot.docs[0].data();
      console.log('📸 Testing with photo:', photo.originalName);
      
      const ingestResponse = await fetch('http://localhost:5000/api/v2/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          photo_id: photosSnapshot.docs[0].id,
          image_url: photo.cloudinaryUrl
        })
      });
      
      const ingestResult = await ingestResponse.json();
      console.log('📥 Ingest result:', ingestResult);
      
      if (ingestResult.success) {
        console.log('✅ Photo ingested successfully!');
        
        // Test match again
        console.log('🧪 Testing match after ingestion...');
        const matchResponse2 = await fetch('http://localhost:5000/api/v2/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            user_embedding: normalizedEmbedding,
            top_k: 5,
            threshold: 0.1
          })
        });
        
        const matchResult2 = await matchResponse2.json();
        console.log('📥 Match result after ingestion:', matchResult2);
        
        if (matchResult2.success && matchResult2.matches && matchResult2.matches.length > 0) {
          console.log('🎉 SUCCESS! FAISS index now has data and matching works!');
        } else {
          console.log('❌ Still no matches - there might be an issue with the embedding computation');
        }
      } else {
        console.log('❌ Photo ingestion failed:', ingestResult.message);
      }
    } else {
      console.log('❌ No photos found in Firestore for this event');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

// Make it available globally
window.debugV2System = debugV2System;

console.log(`
🔧 V2 System Debug Ready!

To debug the V2 system:
debugV2System()

This will test FAISS index and photo ingestion.
`);

export { debugV2System };
