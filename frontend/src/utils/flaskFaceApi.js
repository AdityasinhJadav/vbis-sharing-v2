// Flask backend API service for face recognition
import { getOptimizedImageUrl } from './cloudinary';
const FLASK_API_BASE = 'http://localhost:5000/api';

class FlaskFaceAPI {
  constructor() {
    this.baseURL = FLASK_API_BASE;
  }

  // Analyze face from uploaded file
  async analyzeFace(imageFile) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch(`${this.baseURL}/face/analyze`, {
        method: 'POST',
        body: formData,
      });

      // Treat 200 with empty faces as success; only throw on 500-level
      if (!response.ok && response.status >= 500) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Face analysis failed');
      }

      const data = await response.json();
      // Normalize success=false with no faces to an empty result
      if (data && data.success === true && Array.isArray(data.face_encodings)) {
        return data;
      }
      if (data && data.success === false && data.message && data.message.includes('No faces')) {
        return { success: true, face_encodings: [] };
      }
      return data;
    } catch (error) {
      console.error('Error analyzing face:', error);
      throw error;
    }
  }

  // Analyze face from image URL
  async analyzeFaceFromUrl(imageUrl) {
    try {
      const response = await fetch(`${this.baseURL}/face/analyze-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_url: imageUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Face analysis failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing face from URL:', error);
      throw error;
    }
  }

  // Match user face against photo collection
  async matchFaces(userDescriptor, photoCollection, threshold = 0.6) {
    try {
      const response = await fetch(`${this.baseURL}/face/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_descriptor: userDescriptor,
          photo_collection: photoCollection,
          threshold: threshold,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Face matching failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error matching faces:', error);
      throw error;
    }
  }

  // V2: Ingest photo into FAISS index
  async ingestPhoto(eventId, photoId, imageUrl, embedding = null) {
    try {
      const response = await fetch(`${this.baseURL}/v2/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          photo_id: photoId,
          image_url: imageUrl,
          embedding: embedding,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Ingest failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error ingesting photo:', error);
      throw error;
    }
  }


  // V2: Fast match using FAISS
  async fastMatch(eventId, userEmbedding, topK = 20, threshold = 0.35) {
    try {
      const response = await fetch(`${this.baseURL}/v2/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          user_embedding: userEmbedding,
          top_k: topK,
          threshold: threshold,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Fast match failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in fast match:', error);
      throw error;
    }
  }

  // Calculate similarity between two face encodings
  async calculateSimilarity(encoding1, encoding2) {
    try {
      const response = await fetch(`${this.baseURL}/face/similarity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encoding1: encoding1,
          encoding2: encoding2,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Similarity calculation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error calculating similarity:', error);
      throw error;
    }
  }

  // Process multiple photos in batch
  async batchProcessPhotos(photoUrls) {
    try {
      const response = await fetch(`${this.baseURL}/face/batch-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo_urls: photoUrls,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Batch processing failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in batch processing:', error);
      throw error;
    }
  }

  // Upload image to Cloudinary through Flask backend
  async uploadToCloudinary(imageFile, folder = 'facematch') {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('folder', folder);

      const response = await fetch(`${this.baseURL}/cloudinary/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  }

  // Check Flask backend health
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
      
      if (!response.ok) {
        throw new Error('Backend not available');
      }

      return await response.json();
    } catch (error) {
      console.error('Backend health check failed:', error);
      throw error;
    }
  }
}

// Face Recognition Service using Flask backend
export class FlaskFaceRecognitionService {
  constructor() {
    this.api = new FlaskFaceAPI();
    this.initialized = false;
    this.descriptorCacheByPhotoId = new Map();
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Check if backend is available
      await this.api.healthCheck();
      this.initialized = true;
      console.log('Flask Face Recognition Service initialized');
    } catch (error) {
      console.error('Failed to initialize Flask Face Recognition Service:', error);
      throw new Error('Backend service not available. Please ensure Flask server is running.');
    }
  }

  // Extract face descriptor from uploaded file
  async getFaceDescriptor(imageFile) {
    if (!this.initialized) await this.initialize();
    
    const result = await this.api.analyzeFace(imageFile);
    
    if (!result.success) {
      throw new Error(result.message || result.error || 'Face analysis failed');
    }
    
    return result.descriptor;
  }

  // Extract face descriptors from image URL
  async getFaceDescriptorsFromUrl(imageUrl) {
    if (!this.initialized) await this.initialize();
    
    const result = await this.api.analyzeFaceFromUrl(imageUrl);
    
    if (!result.success) {
      return null; // No faces found
    }
    
    return result.face_encodings.map(face => face.encoding);
  }

  // Find matching photos based on user's face (V2: Fast FAISS matching)
  // Get real ArcFace embedding from backend
  async getRealArcFaceEmbedding(userImageFile) {
    try {
      console.log('🔄 Getting real ArcFace embedding from backend...');
      
      // Send the user's image to the backend for ArcFace analysis
      const formData = new FormData();
      formData.append('image', userImageFile);
      
      const response = await fetch(`${this.api.baseURL}/v2/analyze`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Backend analysis failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.embedding) {
        console.log('✅ Got real ArcFace embedding from backend');
        console.log('📊 Embedding length:', result.embedding.length);
        return result.embedding;
      } else {
        throw new Error(result.message || 'Failed to get ArcFace embedding');
      }
    } catch (error) {
      console.error('Error getting real ArcFace embedding:', error);
      return null;
    }
  }

  // Get ArcFace embedding for user image (legacy method)
  async getArcFaceEmbedding(userDescriptor) {
    try {
      // For now, we'll use a more realistic approach: create an embedding based on the user's face descriptor
      // This gives us a better chance of matching with photos that have similar face characteristics
      console.log('⚠️ Using face-descriptor-based ArcFace embedding - this needs proper implementation');
      
      // Convert the 128-dimensional face descriptor to a 512-dimensional embedding
      // We'll repeat and modify the original descriptor to create a 512-dim vector
      const embedding = [];
      const descriptorLength = userDescriptor.length; // Should be 128
      
      for (let i = 0; i < 512; i++) {
        // Use the original descriptor values, cycling through them
        const sourceIndex = i % descriptorLength;
        let value = userDescriptor[sourceIndex];
        
        // Add some variation based on position to make it more realistic
        value = value * (1 + (i / 512) * 0.1); // Slight variation
        embedding.push(value);
      }
      
      // Normalize the embedding (important for cosine similarity)
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      const normalizedEmbedding = embedding.map(val => val / magnitude);
      
      console.log('📊 Generated face-based embedding with magnitude:', magnitude);
      console.log('📊 Original descriptor length:', descriptorLength);
      console.log('📊 Final embedding length:', normalizedEmbedding.length);
      console.log('📊 First 5 values:', normalizedEmbedding.slice(0, 5));
      return normalizedEmbedding;
    } catch (error) {
      console.error('Error getting ArcFace embedding:', error);
      return null;
    }
  }

  async findMatchingPhotos(userDescriptor, allPhotos, threshold = 0.6, userImageFile = null) {
    if (!this.initialized) await this.initialize();
    
    console.log('🔍 Starting V2 face matching process...');
    console.log('User descriptor length:', userDescriptor ? userDescriptor.length : 'null');
    console.log('Total photos to analyze:', allPhotos.length);
    console.log('Threshold:', threshold);
    
    // Extract event ID from photos (assuming all photos belong to same event)
    const eventId = allPhotos[0]?.event_id;
    if (!eventId) {
      throw new Error('No event ID found in photos. Please ensure photos are properly associated with an event.');
    }
    
    console.log('📦 Event ID:', eventId);
    
    // Try V2 fast matching with proper ArcFace embeddings
    try {
      console.log('🚀 Attempting V2 fast matching with FAISS...');
      
      // Get the user's ArcFace embedding from the backend
      console.log('🔄 Getting real ArcFace embedding from backend...');
      
      // We need to send the user's image to the backend to get proper ArcFace embedding
      if (!userImageFile) {
        throw new Error('User image file is required for V2 matching');
      }
      
      const arcFaceEmbedding = await this.getRealArcFaceEmbedding(userImageFile);
      if (!arcFaceEmbedding) {
        throw new Error('Failed to get real ArcFace embedding from backend');
      }
      
      console.log('✅ Got real ArcFace embedding (512-dim)');
      const matchThreshold = 0.3; // Reasonable threshold for real embeddings
      console.log('🎯 Using match threshold:', matchThreshold);
      const result = await this.api.fastMatch(eventId, arcFaceEmbedding, 50, matchThreshold);
      
      if (result.success && result.matches) {
        console.log('✅ V2 fast matching successful!');
        console.log(`- Matches found: ${result.matches.length}`);
        console.log(`- Threshold used: ${result.threshold_used}`);
        
        // Map results back to full photo objects
        const matchingPhotos = result.matches.map(match => {
          const originalPhoto = allPhotos.find(photo => photo.id === match.id);
          return {
            ...originalPhoto,
            matchScore: match.score,
            similarity: match.score, // FAISS returns cosine similarity
            distance: 1 - match.score // Convert similarity to distance
          };
        });
        
        console.log('📋 V2 matching results:', matchingPhotos);
        return matchingPhotos;
      }
    } catch (error) {
      console.warn('⚠️ V2 fast matching failed, falling back to V1:', error.message);
    }
    
    // Fallback to V1 method if V2 fails
    console.log('🔄 Falling back to V1 face matching...');
    
    // First, analyze all photos to extract face descriptors
    console.log('⚡ Extracting face descriptors from', allPhotos.length, 'photos...');

    const photoCollection = [];
    let processedCount = 0;
    let facesFoundCount = 0;

    // Concurrency-limited processing
    const CONCURRENCY = Math.min(8, Math.max(2, navigator.hardwareConcurrency || 4));
    let index = 0;

    const next = async () => {
      const i = index++;
      if (i >= allPhotos.length) return;
      const photo = allPhotos[i];
      processedCount++;
      console.log(`📷 Processing photo ${i + 1}/${allPhotos.length}: ${photo.originalName || photo.id}`);

      try {
        // Use session cache to avoid reprocessing
        let descriptors = this.descriptorCacheByPhotoId.get(photo.id);
        if (!descriptors) {
          // Prefer a downscaled Cloudinary URL for faster backend analysis
          const analyzeUrl = photo.cloudinaryPublicId
            ? getOptimizedImageUrl(photo.cloudinaryPublicId, { width: 512, height: 512, crop: 'limit', quality: '70' })
            : photo.cloudinaryUrl;
          descriptors = await this.getFaceDescriptorsFromUrl(analyzeUrl);
          if (descriptors && descriptors.length) {
            this.descriptorCacheByPhotoId.set(photo.id, descriptors);
          }
        }

        if (descriptors && descriptors.length > 0) {
          facesFoundCount++;
          // Use the first (strongest) face detected
          photoCollection.push({
            id: photo.id,
            descriptor: descriptors[0],
            cloudinaryUrl: photo.cloudinaryUrl,
            originalName: photo.originalName,
            uploadedBy: photo.uploadedBy,
            uploadedAt: photo.uploadedAt
          });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to analyze photo ${photo.id} (${photo.originalName}):`, error.message || error);
      }
      await next();
    };

    const workers = Array.from({ length: CONCURRENCY }, () => next());
    await Promise.all(workers);
    
    console.log(`📊 Face detection summary:`);
    console.log(`- Photos processed: ${processedCount}/${allPhotos.length}`);
    console.log(`- Photos with faces: ${facesFoundCount}/${allPhotos.length}`);
    console.log(`- Photos ready for matching: ${photoCollection.length}`);
    
    if (photoCollection.length === 0) {
      throw new Error('No faces found in any of the photos to match against. Please ensure the photos contain clear, visible faces.');
    }
    
    // Match faces using Flask backend
    console.log('🎯 Starting face matching with Flask backend...');
    const result = await this.api.matchFaces(userDescriptor, photoCollection, threshold);
    
    if (!result.success) {
      throw new Error(result.message || 'Face matching failed');
    }
    
    console.log('🎉 Face matching completed!');
    console.log(`- Total photos analyzed: ${result.total_photos}`);
    console.log(`- Matches found: ${result.matched_count}`);
    console.log(`- Threshold used: ${result.threshold_used}`);
    
    // Map results back to full photo objects with match scores
    const matchingPhotos = result.matched_photos.map(match => {
      // Find the original photo object
      const originalPhoto = allPhotos.find(photo => photo.id === match.id);
      return {
        ...originalPhoto,
        matchScore: match.score,
        similarity: match.similarity,
        distance: match.distance
      };
    });
    
    console.log('📋 Final matching results:', matchingPhotos);
    return matchingPhotos;
  }

  // Compare two face descriptors
  compareFaces(descriptor1, descriptor2, threshold = 0.6) {
    // This is now handled by the backend, but we keep this for compatibility
    return {
      match: false, // Will be determined by backend
      distance: 1,
      similarity: 0
    };
  }
}

// Export singleton instance
export const flaskFaceService = new FlaskFaceRecognitionService();
