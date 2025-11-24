// Flask Face Recognition Service
// Communicates with the Flask backend for face recognition operations

const FLASK_API_URL = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000/api';
const FLASK_SERVICE_SECRET = import.meta.env.VITE_FLASK_SERVICE_SECRET || '';

class FlaskFaceService {
  constructor() {
    this.initialized = false;
    this.baseURL = FLASK_API_URL;
  }

  async initialize() {
    try {
      // Check if Flask service is available
      const healthResponse = await fetch(`${this.baseURL.replace('/api', '')}/health`);
      if (!healthResponse.ok) {
        throw new Error('Flask service not available');
      }
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Flask service initialization failed:', error);
      this.initialized = false;
      throw new Error('Backend service not available');
    }
  }

  async getFaceDescriptor(imageFile) {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch(`${this.baseURL}/v2/analyze`, {
        method: 'POST',
        headers: {
          'X-Service-Secret': FLASK_SERVICE_SECRET,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to analyze face');
      }

      const data = await response.json();

      if (!data.success || !data.embedding) {
        throw new Error(data.message || 'No faces detected');
      }

      return data.embedding;
    } catch (error) {
      console.error('Get face descriptor error:', error);
      if (error.message.includes('No faces')) {
        throw new Error('No faces detected in the image. Please try a clearer photo with good lighting.');
      }
      throw error;
    }
  }

  async findMatchingPhotos(userDescriptor, photos, threshold = 0.5, userImageFile = null) {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    if (!userDescriptor || !Array.isArray(userDescriptor)) {
      throw new Error('Invalid user descriptor');
    }

    if (!photos || photos.length === 0) {
      return [];
    }

    try {
      // Get event ID from first photo (assuming all photos belong to same event)
      const eventId = photos[0]?.event_id;
      if (!eventId) {
        throw new Error('Event ID not found in photos');
      }

      // Call Flask backend to find matches
      const response = await fetch(`${this.baseURL}/v2/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': FLASK_SERVICE_SECRET,
        },
        body: JSON.stringify({
          event_id: eventId,
          user_embedding: userDescriptor,
          threshold: threshold,
          top_k: 100, // Get top 100 matches
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to find matching photos');
      }

      const data = await response.json();

      if (!data.success || !data.matches) {
        return [];
      }

      // Map Flask results to photo objects with match scores
      const photoMap = new Map(photos.map(p => [p.id, p]));

      const matchedPhotos = data.matches
        .map(match => {
          const photoId = match.id?.split('#')[0]; // Handle face IDs like "photo_id#face_index"
          const photo = photoMap.get(photoId);
          
          if (!photo) {
            return null;
          }

          return {
            ...photo,
            matchScore: match.score || match.similarity || 0,
          };
        })
        .filter(photo => photo !== null)
        .sort((a, b) => b.matchScore - a.matchScore); // Sort by match score descending

      return matchedPhotos;
    } catch (error) {
      console.error('Find matching photos error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const flaskFaceService = new FlaskFaceService();

