/**
 * Test Cloudinary deletion functionality
 */

export const testCloudinaryDeletion = async () => {
  console.log('🧪 Testing Cloudinary deletion...');
  
  try {
    // Test with a dummy public ID (this will fail but should show the API is working)
    const testPublicIds = ['test-image-123'];
    
    const response = await fetch('http://localhost:5000/api/v2/delete-cloudinary-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_ids: testPublicIds
      })
    });
    
    const result = await response.json();
    
    console.log('📊 Cloudinary deletion test result:');
    console.log('- Status:', response.status);
    console.log('- Success:', result.success);
    console.log('- Message:', result.message);
    console.log('- Deleted count:', result.deleted_count);
    
    if (response.ok) {
      console.log('✅ Cloudinary deletion API is working!');
      return true;
    } else {
      console.log('❌ Cloudinary deletion API failed:', result.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Cloudinary deletion test error:', error);
    return false;
  }
};

// Test Flask backend connectivity
export const testFlaskBackend = async () => {
  console.log('🧪 Testing Flask backend connectivity...');
  
  try {
    const response = await fetch('http://localhost:5000/health');
    const result = await response.json();
    
    console.log('📊 Flask backend health check:');
    console.log('- Status:', response.status);
    console.log('- Result:', result);
    
    if (response.ok) {
      console.log('✅ Flask backend is running!');
      return true;
    } else {
      console.log('❌ Flask backend is not responding');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Flask backend test error:', error);
    console.log('💡 Make sure Flask backend is running on http://localhost:5000');
    return false;
  }
};

// Run all tests
export const runAllTests = async () => {
  console.log('🚀 Running Cloudinary deletion tests...\n');
  
  const flaskTest = await testFlaskBackend();
  console.log('');
  
  if (flaskTest) {
    await testCloudinaryDeletion();
  } else {
    console.log('❌ Skipping Cloudinary test - Flask backend not available');
  }
  
  console.log('\n🏁 Tests completed!');
};
