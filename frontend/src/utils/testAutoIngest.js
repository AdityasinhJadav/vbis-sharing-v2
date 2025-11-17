/**
 * Test automatic ingestion functionality
 */

import { flaskFaceService } from './flaskFaceApi';

/**
 * Test if the Flask service is accessible and working
 */
export const testFlaskService = async () => {
  console.log('🧪 Testing Flask service connectivity...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${flaskFaceService.api.baseURL}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Flask service is healthy:', healthData);
      return true;
    } else {
      console.error('❌ Flask service health check failed:', healthResponse.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Flask service is not accessible:', error);
    return false;
  }
};

/**
 * Test the ingest API endpoint
 */
export const testIngestAPI = async () => {
  console.log('🧪 Testing ingest API...');
  
  try {
    // Test with a dummy photo URL
    const testResult = await flaskFaceService.api.ingestPhoto(
      'test_event',
      'test_photo',
      'https://via.placeholder.com/300x300.jpg' // Dummy image
    );
    
    console.log('📊 Ingest API test result:', testResult);
    return testResult;
  } catch (error) {
    console.error('❌ Ingest API test failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test the complete automatic ingestion flow
 */
export const testAutoIngestFlow = async () => {
  console.log('🧪 Testing complete auto-ingest flow...');
  
  const results = {
    flaskService: false,
    ingestAPI: false,
    overall: false
  };
  
  // Test Flask service
  results.flaskService = await testFlaskService();
  
  if (results.flaskService) {
    // Test ingest API
    const ingestTest = await testIngestAPI();
    results.ingestAPI = ingestTest.success;
  }
  
  results.overall = results.flaskService && results.ingestAPI;
  
  console.log('📊 Auto-ingest test results:', results);
  
  if (results.overall) {
    console.log('✅ Automatic ingestion should work correctly!');
  } else {
    console.log('❌ Automatic ingestion has issues:');
    if (!results.flaskService) {
      console.log('   - Flask service is not accessible');
    }
    if (!results.ingestAPI) {
      console.log('   - Ingest API is not working');
    }
  }
  
  return results;
};

/**
 * Debug why automatic ingestion might be failing
 */
export const debugAutoIngest = async () => {
  console.log('🔍 Debugging automatic ingestion...');
  
  // Check Flask service URL
  console.log('🔗 Flask service URL:', flaskFaceService.api.baseURL);
  
  // Test connectivity
  const isHealthy = await testFlaskService();
  
  if (!isHealthy) {
    console.log('❌ Flask service is not running or not accessible');
    console.log('💡 Make sure Flask service is running on http://localhost:5000');
    return;
  }
  
  // Test ingest API
  const ingestTest = await testIngestAPI();
  
  if (!ingestTest.success) {
    console.log('❌ Ingest API is not working');
    console.log('💡 Check Flask service logs for errors');
    return;
  }
  
  console.log('✅ All tests passed - automatic ingestion should work!');
  console.log('💡 If it\'s still not working, check the browser console during photo upload');
};

