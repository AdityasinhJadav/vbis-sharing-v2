const axios = require('axios');
const FormData = require('form-data');
const { logger } = require('../middleware/security');

const flaskBaseURL = process.env.FLASK_SERVICE_URL || 'http://localhost:5000';
const flaskSecret = process.env.FLASK_SERVICE_SECRET;

const client = axios.create({
  baseURL: flaskBaseURL,
  timeout: 20000
});

const authHeaders = () => ({
  'X-Service-Secret': flaskSecret
});

async function ingestPhoto(eventId, photoId, imageUrl) {
  if (!flaskBaseURL) throw new Error('Flask service not configured');
  try {
    const { data } = await client.post(
      '/api/v2/ingest',
      {
        event_id: eventId,
        photo_id: photoId,
        image_url: imageUrl
      },
      { headers: authHeaders() }
    );
    return data;
  } catch (error) {
    logger.error('Flask ingest failed', {
      eventId,
      photoId,
      error: error.response?.data || error.message
    });
    throw error;
  }
}

async function analyzeEmbedding(fileBuffer, filename) {
  if (!flaskBaseURL) throw new Error('Flask service not configured');
  const formData = new FormData();
  formData.append('image', fileBuffer, {
    filename: filename || 'candidate.jpg',
    contentType: 'image/jpeg'
  });
  try {
    const { data } = await client.post('/api/v2/analyze', formData, {
      headers: {
        ...formData.getHeaders(),
        ...authHeaders()
      }
    });
    return data;
  } catch (error) {
    logger.error('Flask analyze failed', {
      error: error.response?.data || error.message
    });
    throw error;
  }
}

async function matchFaces(eventId, embedding, { topK = 50, threshold = 0.4 } = {}) {
  if (!flaskBaseURL) throw new Error('Flask service not configured');
  try {
    const { data } = await client.post(
      '/api/v2/match',
      {
        event_id: eventId,
        user_embedding: embedding,
        top_k: topK,
        threshold
      },
      { headers: authHeaders() }
    );
    return data;
  } catch (error) {
    logger.error('Flask match failed', {
      eventId,
      error: error.response?.data || error.message
    });
    throw error;
  }
}

module.exports = {
  ingestPhoto,
  analyzeEmbedding,
  matchFaces
};


