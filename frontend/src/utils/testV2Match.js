// Test V2 match endpoint directly
const testV2Match = async () => {
  console.log('🧪 Testing V2 match endpoint...');
  
  try {
    // Create a dummy 512-dimensional embedding (ArcFace size)
    const dummyEmbedding = new Array(512).fill(0.1);
    
    console.log('📤 Sending match request...');
    console.log('Event ID: Hnv5xnA57r2DrtIQzUHF');
    console.log('Embedding length:', dummyEmbedding.length);
    
    const response = await fetch('http://localhost:5000/api/v2/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_id: 'Hnv5xnA57r2DrtIQzUHF',
        user_embedding: dummyEmbedding,
        top_k: 5,
        threshold: 0.1
      })
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('📥 Response body:', result);
    
    if (response.ok) {
      console.log('✅ V2 match endpoint is working!');
      console.log('Matches found:', result.matches?.length || 0);
    } else {
      console.log('❌ V2 match endpoint failed:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

// Make it available globally
window.testV2Match = testV2Match;

console.log(`
🧪 V2 Match Test Ready!

To test the V2 match endpoint:
testV2Match()

This will help us debug the 500 error.
`);

export { testV2Match };
