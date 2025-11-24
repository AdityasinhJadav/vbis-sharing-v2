/**
 * Script to process existing photos that haven't been ingested into FAISS
 * 
 * Usage:
 *   node scripts/process-existing-photos.js [roomId]
 * 
 * If roomId is provided, only processes photos for that room
 * If no roomId, processes all unprocessed photos
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Photo = require('../src/models/Photo');
const Room = require('../src/models/Room');
const flaskClient = require('../src/services/flaskClient');
const { logger } = require('../src/middleware/security');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/facematch';
const roomIdArg = process.argv[2]; // Optional room ID from command line

async function processExistingPhotos() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Build query
    const query = { processed: false };
    if (roomIdArg) {
      query.roomId = roomIdArg;
      const room = await Room.findOne({ id: roomIdArg });
      if (!room) {
        console.error(`❌ Room with ID "${roomIdArg}" not found`);
        process.exit(1);
      }
      console.log(`📁 Processing photos for room: ${room.name} (${room.code})`);
    } else {
      console.log('📁 Processing all unprocessed photos');
    }

    // Find all unprocessed photos
    const unprocessedPhotos = await Photo.find(query);
    
    if (unprocessedPhotos.length === 0) {
      console.log('✅ No unprocessed photos found!');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`\n📊 Found ${unprocessedPhotos.length} unprocessed photo(s)\n`);

    // Group by room for better organization
    const photosByRoom = {};
    for (const photo of unprocessedPhotos) {
      if (!photosByRoom[photo.roomId]) {
        photosByRoom[photo.roomId] = [];
      }
      photosByRoom[photo.roomId].push(photo);
    }

    let totalSuccess = 0;
    let totalFailed = 0;

    // Process each room
    for (const [roomId, photos] of Object.entries(photosByRoom)) {
      const room = await Room.findOne({ id: roomId });
      const roomName = room ? room.name : roomId;
      
      console.log(`\n🏠 Room: ${roomName} (${photos.length} photos)`);
      console.log('─'.repeat(50));

      // Process photos sequentially with delays to avoid rate limiting
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        
        try {
          console.log(`  Processing ${i + 1}/${photos.length}: ${photo.id} (${photo.originalName || 'unnamed'})`);
          
          // Validate URL
          if (!photo.url || (!photo.url.startsWith('http://') && !photo.url.startsWith('https://'))) {
            throw new Error(`Invalid URL format: ${photo.url}`);
          }

          // Ingest into FAISS
          const result = await flaskClient.ingestPhoto(roomId, photo.id, photo.url);
          
          if (!result.success) {
            throw new Error(result.message || 'Ingestion failed');
          }

          // Update photo as processed
          await Photo.findOneAndUpdate(
            { id: photo.id },
            { processed: true },
            { new: true }
          );

          console.log(`  ✅ Success: ${photo.id}`);
          totalSuccess++;
          
          // Add delay between requests (2 seconds = max 30 requests per minute)
          if (i < photos.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
          
          // Check if it's a rate limit error
          if (error.response?.status === 429 || errorMsg.includes('Rate limit')) {
            console.log(`  ⚠️  Rate limit hit, waiting 10 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
            // Retry this photo
            i--; // Decrement to retry this photo
            continue;
          }
          
          console.log(`  ❌ Failed: ${photo.id} - ${errorMsg}`);
          totalFailed++;
          
          // Add delay even on error
          if (i < photos.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Processing Summary:');
    console.log(`  ✅ Success: ${totalSuccess}`);
    console.log(`  ❌ Failed: ${totalFailed}`);
    console.log(`  📁 Total: ${unprocessedPhotos.length}`);
    console.log('='.repeat(50));

    // Disconnect
    await mongoose.disconnect();
    console.log('\n✅ Done!');

    process.exit(totalFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error processing photos:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
processExistingPhotos();

