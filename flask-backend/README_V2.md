# FaceMatch V2 - Industry-Grade Face Recognition

This document describes the new V2 face recognition system using InsightFace + FAISS for production-grade performance and accuracy.

## Overview

The V2 system provides:
- **90-95% accuracy** using ArcFace embeddings (InsightFace)
- **Sub-50ms search** with FAISS approximate nearest neighbors
- **Per-event indexing** for data isolation
- **Background processing** for scalable ingestion

## Architecture

```
Frontend → Flask API → InsightFace + FAISS → Results
    ↓
Background Worker → Firebase → Ingest Photos
```

## Installation

### Backend Dependencies

```bash
# CPU version (recommended for development)
pip install insightface onnxruntime faiss-cpu

# GPU version (for production with CUDA)
pip install insightface onnxruntime-gpu faiss-cpu
```

### Model Download

InsightFace will automatically download the `buffalo_l` model on first use (~100MB).

## API Endpoints

### V2 Endpoints (New)

#### Ingest Photo
```http
POST /api/v2/ingest
Content-Type: application/json

{
  "event_id": "EVENT123",
  "photo_id": "photo_abc123",
  "image_url": "https://res.cloudinary.com/...",
  "embedding": [0.1, 0.2, ...] // Optional: pre-computed embedding
}
```

#### Fast Match
```http
POST /api/v2/match
Content-Type: application/json

{
  "event_id": "EVENT123",
  "user_embedding": [0.1, 0.2, ...],
  "top_k": 20,
  "threshold": 0.35
}
```

### V1 Endpoints (Legacy)

All existing V1 endpoints remain functional for backward compatibility.

## Usage

### 1. Start the Flask Backend

```bash
cd flask-backend
python app_advanced.py
```

### 2. Ingest Photos

#### Option A: Manual Ingest
```python
import requests

# Ingest a single photo
response = requests.post('http://localhost:5000/api/v2/ingest', json={
    'event_id': 'EVENT123',
    'photo_id': 'photo_abc123',
    'image_url': 'https://res.cloudinary.com/your-cloud/image/upload/photo.jpg'
})
```

#### Option B: Bulk Ingest
```bash
# Ingest all photos for an event
python bulk_ingest.py --event-id EVENT123 --firebase-config firebase_config.json

# Ingest all events
python bulk_ingest.py --all-events --firebase-config firebase_config.json
```

#### Option C: Background Worker
```bash
# Run continuous worker
python photo_worker.py --firebase-config firebase_config.json --poll-interval 30

# Run once
python photo_worker.py --once --firebase-config firebase_config.json
```

### 3. Fast Matching

```python
import requests

# Get user embedding (use existing V1 analyze endpoint)
user_response = requests.post('http://localhost:5000/api/face/analyze', files={
    'image': open('user_photo.jpg', 'rb')
})
user_embedding = user_response.json()['descriptor']

# Fast match using FAISS
match_response = requests.post('http://localhost:5000/api/v2/match', json={
    'event_id': 'EVENT123',
    'user_embedding': user_embedding,
    'top_k': 20,
    'threshold': 0.35
})

matches = match_response.json()['matches']
```

## Performance

### Expected Performance (Typical)

| Operation | CPU (8 cores) | GPU (CUDA) |
|-----------|---------------|------------|
| Embedding computation | 30-60ms | 5-10ms |
| FAISS search (10k photos) | <5ms | <5ms |
| End-to-end match | 20-40ms | 10-20ms |

### Optimization Tips

1. **Use GPU**: Install `onnxruntime-gpu` for 5-10x faster embedding computation
2. **Batch processing**: Use the bulk ingest script for initial setup
3. **Background workers**: Run photo workers to process uploads asynchronously
4. **Cloudinary optimization**: Use downscaled images (640px) for faster processing

## Configuration

### Thresholds

- **ArcFace threshold**: 0.35-0.45 (cosine similarity)
- **Lower = stricter matching**
- **Higher = more permissive matching**

### Model Settings

```python
# In insightface_faiss_service.py
self.app = insightface.app.FaceAnalysis(
    name="buffalo_l",  # Model name
    providers=["CUDAExecutionProvider", "CPUExecutionProvider"]  # GPU + CPU fallback
)
```

## Monitoring

### Health Check

```bash
curl http://localhost:5000/health
```

Response includes `insightface_ready: true` when V2 is available.

### Logs

The system logs detailed information about:
- Embedding computation times
- FAISS search performance
- Ingest success/failure rates
- Memory usage

## Troubleshooting

### Common Issues

1. **"insightface_ready: false"**
   - Install dependencies: `pip install insightface onnxruntime faiss-cpu`
   - Check model download (first run downloads ~100MB)

2. **Slow embedding computation**
   - Install GPU version: `pip install onnxruntime-gpu`
   - Ensure CUDA is properly configured

3. **FAISS search errors**
   - Check event_id exists in index
   - Verify embedding dimensions (should be 512)

4. **Memory issues**
   - Reduce batch sizes in bulk ingest
   - Use smaller image sizes for embedding computation

### Debug Mode

Enable detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Migration from V1

The V2 system is designed to work alongside V1:

1. **Frontend**: Automatically tries V2 first, falls back to V1
2. **Backend**: V1 endpoints remain unchanged
3. **Data**: No migration needed - V2 uses same photo data

## Production Deployment

### Recommended Setup

1. **Flask**: Use Gunicorn with 4-8 workers
2. **GPU**: Use `onnxruntime-gpu` for embedding computation
3. **FAISS**: Consider `faiss-gpu` for very large indices (>100k photos)
4. **Background**: Run photo workers as separate processes
5. **Monitoring**: Add health checks and metrics

### Example Gunicorn Command

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app_advanced:app
```

### Example Systemd Service

```ini
[Unit]
Description=FaceMatch V2 Worker
After=network.target

[Service]
Type=simple
User=facematch
WorkingDirectory=/path/to/flask-backend
ExecStart=/path/to/venv/bin/python photo_worker.py --firebase-config /path/to/firebase.json
Restart=always

[Install]
WantedBy=multi-user.target
```

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify all dependencies are installed correctly
3. Test with the health check endpoint
4. Try the bulk ingest script for testing
