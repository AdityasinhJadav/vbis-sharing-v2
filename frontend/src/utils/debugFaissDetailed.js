// Detailed FAISS debugging
const debugFaissDetailed = async () => {
  console.log('🔍 Detailed FAISS debugging...');
  
  const eventId = 'Hnv5xnA57r2DrtIQzUHF';
  
  try {
    // Test 1: Check what happens with different embedding sizes
    console.log('🧪 Test 1: Different embedding sizes...');
    
    const tests = [
      { name: '5-dim embedding', embedding: [0.1, 0.2, 0.3, 0.4, 0.5] },
      { name: '128-dim embedding', embedding: new Array(128).fill(0.1) },
      { name: '512-dim embedding', embedding: new Array(512).fill(0.1) },
      { name: '512-dim random', embedding: Array.from({length: 512}, () => Math.random() - 0.5) }
    ];
    
    for (const test of tests) {
      try {
        console.log(`  🔄 Testing ${test.name}...`);
        
        const response = await fetch('http://localhost:5000/api/v2/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            user_embedding: test.embedding,
            top_k: 5,
            threshold: 0.01
          })
        });
        
        const result = await response.json();
        console.log(`  📥 ${test.name} result:`, result);
        
        if (result.success && result.matches && result.matches.length > 0) {
          console.log(`  ✅ ${test.name} found ${result.matches.length} matches!`);
        } else {
          console.log(`  ❌ ${test.name} found 0 matches`);
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} failed:`, error.message);
      }
    }
    
    // Test 2: Check if the issue is with the event ID
    console.log('\n🧪 Test 2: Different event IDs...');
    
    const eventIds = [
      'Hnv5xnA57r2DrtIQzUHF',
      'test_event',
      'marriage',
      'ADITYA'
    ];
    
    for (const testEventId of eventIds) {
      try {
        console.log(`  🔄 Testing event ID: ${testEventId}...`);
        
        const response = await fetch('http://localhost:5000/api/v2/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: testEventId,
            user_embedding: new Array(512).fill(0.1),
            top_k: 5,
            threshold: 0.01
          })
        });
        
        const result = await response.json();
        console.log(`  📥 Event ${testEventId} result:`, result);
        
        if (result.success && result.matches && result.matches.length > 0) {
          console.log(`  ✅ Event ${testEventId} found ${result.matches.length} matches!`);
        } else {
          console.log(`  ❌ Event ${testEventId} found 0 matches`);
        }
      } catch (error) {
        console.log(`  ❌ Event ${testEventId} failed:`, error.message);
      }
    }
    
    // Test 3: Check backend health
    console.log('\n🧪 Test 3: Backend health...');
    
    try {
      const healthResponse = await fetch('http://localhost:5000/health');
      const healthResult = await healthResponse.json();
      console.log('📥 Health result:', healthResult);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

// Make it available globally
window.debugFaissDetailed = debugFaissDetailed;

console.log(`
🔧 Detailed FAISS Debug Ready!

To run detailed debugging:
debugFaissDetailed()

This will test different embedding sizes and event IDs.
`);

export { debugFaissDetailed };
