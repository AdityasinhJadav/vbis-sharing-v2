/**
 * Console-friendly script to ingest photos into FAISS
 * Copy and paste this into browser console
 */

// ===== COPY THIS INTO BROWSER CONSOLE =====

async function forceIngestPhotos() {
  const eventId = "bDyVceKopFItZGnn5qKa";
  const flaskBaseUrl = "http://localhost:5000";
  
  console.log(`🚀 Starting force ingest for event: ${eventId}`);
  
  try {
    // Step 1: Get all photos from Firebase
    console.log("📸 Fetching photos from Firebase...");
    
    // You'll need to get photos from your Firebase collection
    // For now, let's create a manual list of photo URLs
    // Replace these with your actual photo URLs from Cloudinary
    
    const photos = [
      // Add your photo URLs here - you can get them from the ViewPhotos page
      // Example: { id: "photo1", url: "https://res.cloudinary.com/..." }
    ];
    
    if (photos.length === 0) {
      console.log("❌ No photos provided. Please add photo URLs to the script.");
      alert("Please add photo URLs to the script first!");
      return;
    }
    
    console.log(`📸 Found ${photos.length} photos to ingest`);
    
    let successCount = 0;
    let failCount = 0;
    const results = [];
    
    // Step 2: Ingest each photo
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      console.log(`🔄 Ingesting photo ${i + 1}/${photos.length}: ${photo.id}`);
      
      try {
        const response = await fetch(`${flaskBaseUrl}/api/v2/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_id: eventId,
            photo_id: photo.id,
            image_url: photo.url
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            successCount++;
            console.log(`✅ Successfully ingested: ${photo.id}`);
            results.push({ id: photo.id, success: true });
          } else {
            failCount++;
            console.log(`❌ Failed to ingest: ${photo.id} - ${result.message}`);
            results.push({ id: photo.id, success: false, error: result.message });
          }
        } else {
          failCount++;
          const error = await response.text();
          console.log(`❌ HTTP error for ${photo.id}: ${response.status} - ${error}`);
          results.push({ id: photo.id, success: false, error: `HTTP ${response.status}` });
        }
      } catch (error) {
        failCount++;
        console.error(`❌ Error ingesting ${photo.id}:`, error);
        results.push({ id: photo.id, success: false, error: error.message });
      }
      
      // Small delay to avoid overwhelming the service
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`🎉 Force ingest completed!`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${photos.length}`);
    
    alert(`Ingest completed!\n✅ Success: ${successCount}\n❌ Failed: ${failCount}\n📊 Total: ${photos.length}`);
    
    return {
      success: true,
      summary: {
        total: photos.length,
        success: successCount,
        failed: failCount
      },
      results
    };
    
  } catch (error) {
    console.error("💥 Force ingest failed:", error);
    alert(`Force ingest failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===== QUICK TEST FUNCTION =====

async function testFaissIndex() {
  const eventId = "bDyVceKopFItZGnn5qKa";
  const flaskBaseUrl = "http://localhost:5000";
  
  console.log("🧪 Testing FAISS index...");
  
  try {
    const dummyEmbedding = new Array(512).fill(0);
    const response = await fetch(`${flaskBaseUrl}/api/v2/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        user_embedding: dummyEmbedding,
        top_k: 5,
        threshold: 0.1
      })
    });
    
    const result = await response.json();
    console.log("FAISS test result:", result);
    
    if (result.success && result.matches && result.matches.length > 0) {
      console.log(`✅ FAISS index has ${result.matches.length} entries`);
      alert(`✅ FAISS index has ${result.matches.length} photos indexed!`);
    } else {
      console.log("❌ FAISS index is empty");
      alert("❌ FAISS index is empty - need to ingest photos!");
    }
    
    return result;
  } catch (error) {
    console.error("Error testing FAISS:", error);
    alert(`Error testing FAISS: ${error.message}`);
    return null;
  }
}

// ===== AUTO-GET PHOTOS FROM VIEWPHOTOS PAGE =====

async function getPhotosFromPage() {
  console.log("🔍 Trying to get photos from the current page...");
  
  // This will work if you're on the ViewPhotos page
  try {
    // Look for photo data in the page
    const photoElements = document.querySelectorAll('[data-photo-id]');
    const photos = [];
    
    photoElements.forEach(element => {
      const photoId = element.getAttribute('data-photo-id');
      const photoUrl = element.querySelector('img')?.src;
      if (photoId && photoUrl) {
        photos.push({ id: photoId, url: photoUrl });
      }
    });
    
    if (photos.length > 0) {
      console.log(`📸 Found ${photos.length} photos on the page`);
      return photos;
    } else {
      console.log("❌ No photos found on the page");
      return [];
    }
  } catch (error) {
    console.error("Error getting photos from page:", error);
    return [];
  }
}

// ===== MAIN EXECUTION =====

console.log("🎯 FaceMatch Force Ingest Script Loaded!");
console.log("Available functions:");
console.log("- testFaissIndex() - Test if FAISS has data");
console.log("- getPhotosFromPage() - Get photos from current page");
console.log("- forceIngestPhotos() - Ingest photos (need to add photo URLs first)");

// Auto-run the test
testFaissIndex();

