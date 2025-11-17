"""
Advanced Flask Backend for FaceMatch using state-of-the-art face recognition
Features industrial-level accuracy with deep learning models
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import logging
from face_recognition_advanced import advanced_face_service
from insightface_faiss_service import insightface_faiss_service
from security_middleware import (
    rate_limit, validate_file_upload, validate_json_input, 
    log_request, error_handler, security_headers
)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize advanced face recognition service
face_service = advanced_face_service

# Initialize the face service
if not face_service.initialized:
    logger.info("Initializing face recognition service...")
    face_service.initialize()
    logger.info("Face recognition service initialized successfully!")

# Initialize the InsightFace service
if not insightface_faiss_service.initialized:
    logger.info("Initializing InsightFace service...")
    insightface_faiss_service.initialize()
    logger.info("InsightFace service initialized successfully!")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'FaceMatch Advanced Flask Backend is running!',
        'service': 'Advanced FaceMatch Backend',
        'version': '2.0.0',
        'face_recognition_ready': face_service.initialized,
        'model_type': 'deep_learning_cnn',
        'accuracy_level': 'industrial_grade',
        'insightface_ready': insightface_faiss_service.initialized
    })

@app.route('/api/face/analyze', methods=['POST'])
@rate_limit(max_requests=20, window=60)
@validate_file_upload
@log_request
@error_handler
@security_headers()
def analyze_face():
    """Analyze uploaded image and extract high-quality face descriptor"""
    try:
        if 'image' not in request.files:
            return jsonify({
                'success': False, 
                'message': 'No image file provided'
            }), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({
                'success': False, 
                'message': 'No image file selected'
            }), 400
        
        # Reset file pointer to beginning
        image_file.seek(0)
        
        logger.info(f"Analyzing uploaded image: {image_file.filename}")
        
        # Check if face service is initialized
        if not face_service.initialized:
            logger.error("Face recognition service not initialized")
            return jsonify({
                'success': False,
                'message': 'Face recognition service not available. Please ensure the service is properly initialized.'
            }), 500
        
        # Get high-quality face descriptor using advanced AI
        descriptor = face_service.get_face_descriptor(image_file)
        
        return jsonify({
            'success': True,
            'descriptor': descriptor,
            'message': 'Face analyzed successfully with advanced AI',
            'encoding_dimensions': len(descriptor),
            'model_type': 'deep_learning_128d'
        })
            
    except Exception as e:
        logger.error(f"Error analyzing face: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/face/analyze-url', methods=['POST'])
@rate_limit(max_requests=20, window=60)
@validate_json_input(['image_url'])
@log_request
@error_handler
@security_headers()
def analyze_face_from_url():
    """Analyze face from image URL using advanced AI"""
    try:
        data = request.get_json()
        
        if not data or 'image_url' not in data:
            return jsonify({
                'success': False, 
                'message': 'No image URL provided'
            }), 400
        
        image_url = data['image_url']
        logger.info(f"🔍 Analyzing image from URL: {image_url}")
        
        # Get face descriptors using advanced AI
        descriptors = face_service.get_face_descriptors_from_url(image_url)
        
        # If image failed to load or no faces found, return 200 with empty result
        if descriptors is None:
            return jsonify({
                'success': True,
                'face_encodings': [],
                'faces_detected': 0,
                'message': 'Image could not be processed or contained no detectable faces'
            })
        
        if len(descriptors) == 0:
            return jsonify({
                'success': True,
                'face_encodings': [],
                'faces_detected': 0,
                'message': 'No faces found in the image'
            })
        
        # Format response to match expected structure
        face_encodings = [{'encoding': desc} for desc in descriptors]
        
        return jsonify({
            'success': True,
            'face_encodings': face_encodings,
            'faces_detected': len(descriptors),
            'message': f'Successfully detected {len(descriptors)} face(s) using advanced AI',
            'model_type': 'deep_learning_128d'
        })
            
    except Exception as e:
        logger.error(f"❌ Error analyzing face from URL: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/face/match', methods=['POST'])
@rate_limit(max_requests=10, window=60)
@validate_json_input(['user_descriptor', 'collection_descriptors'])
@log_request
@error_handler
@security_headers()
def match_faces():
    """Match user face against photo collection using advanced AI"""
    try:
        data = request.get_json()
        
        if not data or 'user_descriptor' not in data or 'photo_collection' not in data:
            return jsonify({
                'success': False, 
                'message': 'Missing required data: user_descriptor and photo_collection'
            }), 400
        
        user_descriptor = data['user_descriptor']
        photo_collection = data['photo_collection']
        tolerance = data.get('tolerance', 0.6)
        
        logger.info(f"🎯 Starting advanced face matching:")
        logger.info(f"   - User descriptor dimensions: {len(user_descriptor)}")
        logger.info(f"   - Photos to analyze: {len(photo_collection)}")
        logger.info(f"   - Tolerance: {tolerance}")
        
        # Validate input data
        if not isinstance(user_descriptor, list) or not isinstance(photo_collection, list):
            return jsonify({
                'success': False, 
                'message': 'Invalid data format'
            }), 400
        
        if len(user_descriptor) != 128:
            return jsonify({
                'success': False, 
                'message': f'Invalid user descriptor: expected 128 dimensions, got {len(user_descriptor)}'
            }), 400
        
        # Find matching photos using advanced AI
        matched_photos = face_service.find_matching_photos(
            user_descriptor, 
            photo_collection, 
            tolerance
        )
        
        # Calculate statistics
        total_photos = len(photo_collection)
        matched_count = len(matched_photos)
        match_rate = (matched_count / total_photos * 100) if total_photos > 0 else 0
        
        logger.info(f"✅ Advanced face matching completed:")
        logger.info(f"   - Total photos: {total_photos}")
        logger.info(f"   - Matches found: {matched_count}")
        logger.info(f"   - Match rate: {match_rate:.1f}%")
        
        if matched_photos:
            avg_confidence = sum(photo['score'] for photo in matched_photos) / len(matched_photos)
            logger.info(f"   - Average confidence: {avg_confidence:.3f}")
        
        return jsonify({
            'success': True,
            'matched_photos': matched_photos,
            'total_photos': total_photos,
            'matched_count': matched_count,
            'match_rate_percent': round(match_rate, 1),
            'threshold_used': tolerance,
            'model_type': 'advanced_deep_learning',
            'average_confidence': round(sum(photo['score'] for photo in matched_photos) / len(matched_photos), 3) if matched_photos else 0
        })
        
    except Exception as e:
        logger.error(f"❌ Error in advanced face matching: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@app.route('/api/v2/analyze', methods=['POST'])
@rate_limit(max_requests=20, window=60)
@validate_file_upload
@log_request
@error_handler
@security_headers()
def v2_analyze():
    """Analyze user image and return ArcFace embedding for V2 matching."""
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': 'image file is required'}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'no image selected'}), 400

        embedding = insightface_faiss_service.get_face_embedding(file)

        if embedding is None:
            # Return 200 with explicit no-face info so frontend can handle gracefully
            return jsonify({
                'success': True,
                'embedding': None,
                'dimension': 0,
                'message': 'No faces found in the image. Please ensure a clear, front-facing face with good lighting.'
            })

        return jsonify({
            'success': True,
            'embedding': embedding.tolist(),
            'dimension': len(embedding),
            'message': 'ArcFace embedding extracted successfully'
        })

    except Exception as e:
        logger.error(f"v2 analyze error: {e}")
        return jsonify({'success': False, 'message': 'Internal error during analysis'}), 500

@app.route('/api/v2/ingest', methods=['POST'])
@rate_limit(max_requests=5, window=60)
@validate_json_input(['event_id', 'photo_id'])
@log_request
@error_handler
@security_headers()
def v2_ingest():
    """Ingest a photo (compute ArcFace embedding and add to FAISS), given event_id and either image_url or embedding."""
    try:
        data = request.get_json()
        event_id = data.get('event_id')
        photo_id = data.get('photo_id')
        image_url = data.get('image_url')
        embedding = data.get('embedding')
        
        logger.info(f"Ingesting photo {photo_id} for event {event_id}")
        logger.info(f"Image URL: {image_url}")
        
        if not event_id or not photo_id:
            logger.error("Missing required parameters: event_id and photo_id")
            return jsonify({'success': False, 'message': 'event_id and photo_id are required'}), 400
        
        # Check if InsightFace service is initialized
        if not insightface_faiss_service.initialized:
            logger.error("InsightFace service not initialized")
            return jsonify({'success': False, 'message': 'InsightFace service not available'}), 500
        
        # Attempt ingestion
        ok = insightface_faiss_service.ingest(event_id, photo_id, image_url=image_url, embedding=embedding)
        
        if ok:
            logger.info(f"✅ Successfully ingested photo {photo_id} for event {event_id}")
            return jsonify({'success': True, 'message': f'Photo {photo_id} ingested successfully'})
        else:
            logger.warning(f"❌ Failed to ingest photo {photo_id} for event {event_id}")
            return jsonify({'success': False, 'message': f'Failed to ingest photo {photo_id}'})
            
    except Exception as e:
        logger.error(f"v2 ingest error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/v2/match', methods=['POST'])
@rate_limit(max_requests=10, window=60)
@validate_json_input(['event_id', 'user_embedding'])
@log_request
@error_handler
@security_headers()
def v2_match():
    """Match a user embedding against the FAISS index of an event (ArcFace)."""
    try:
        data = request.get_json()
        event_id = data.get('event_id')
        user_embedding = data.get('user_embedding')
        top_k = int(data.get('top_k', 20))
        threshold = float(data.get('threshold', 0.35))
        if not event_id or not isinstance(user_embedding, list):
            return jsonify({'success': False, 'message': 'event_id and user_embedding are required'}), 400
        matches = insightface_faiss_service.match(event_id, user_embedding, top_k=top_k, threshold=threshold)
        return jsonify({'success': True, 'matches': matches, 'top_k': top_k, 'threshold_used': threshold})
    except Exception as e:
        logger.error(f"v2 match error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/v2/clear-event', methods=['POST'])
def v2_clear_event():
    """Clear FAISS index and face recognition cache for a specific event."""
    try:
        data = request.get_json()
        event_id = data.get('event_id')
        
        if not event_id:
            return jsonify({'success': False, 'message': 'event_id is required'}), 400
        
        logger.info(f"Clearing FAISS index and cache for event: {event_id}")
        
        # Clear FAISS index for the event
        cleared = insightface_faiss_service.clear_event(event_id)
        
        # Clear face recognition cache for the event
        face_service.clear_event_cache(event_id)
        
        return jsonify({
            'success': True,
            'message': f'Cleared FAISS index and cache for event {event_id}',
            'faiss_cleared': cleared
        })
        
    except Exception as e:
        logger.error(f"v2 clear-event error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/v2/faiss-status', methods=['GET'])
def v2_faiss_status():
    """Check FAISS index status for an event."""
    try:
        event_id = request.args.get('event_id')
        
        if not event_id:
            return jsonify({'success': False, 'message': 'event_id is required'}), 400
        
        logger.info(f"Checking FAISS status for event: {event_id}")
        
        # Check if event has FAISS index
        has_index = event_id in insightface_faiss_service.event_indices
        
        if has_index:
            index = insightface_faiss_service.event_indices[event_id]
            photo_count = len(index.get('photo_ids', []))
            index_size = index.get('index', {}).ntotal if hasattr(index.get('index', {}), 'ntotal') else 0
        else:
            photo_count = 0
            index_size = 0
        
        return jsonify({
            'success': True,
            'event_id': event_id,
            'has_index': has_index,
            'photo_count': photo_count,
            'index_size': index_size,
            'message': f'FAISS index status for event {event_id}'
        })
        
    except Exception as e:
        logger.error(f"v2 faiss-status error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/v2/delete-cloudinary-batch', methods=['POST'])
def v2_delete_cloudinary_batch():
    """Delete multiple Cloudinary images in batch."""
    try:
        data = request.get_json()
        public_ids = data.get('public_ids', [])
        
        if not public_ids:
            return jsonify({'success': False, 'message': 'public_ids array is required'}), 400
        
        logger.info(f"Deleting {len(public_ids)} Cloudinary images")
        
        # Check if Cloudinary credentials are available
        cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
        api_key = os.getenv('CLOUDINARY_API_KEY')
        api_secret = os.getenv('CLOUDINARY_API_SECRET')
        
        if not cloud_name or not api_key or not api_secret:
            logger.error("Cloudinary credentials not configured")
            return jsonify({
                'success': False, 
                'message': 'Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.',
                'deleted_count': 0
            }), 500
        
        # Use Cloudinary Admin API for batch deletion
        import cloudinary
        import cloudinary.api
        
        # Configure Cloudinary
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret
        )
        
        # Delete resources in batch
        result = cloudinary.api.delete_resources(public_ids)
        
        logger.info(f"Cloudinary deletion result: {result}")
        
        return jsonify({
            'success': True,
            'message': f'Deleted {len(public_ids)} Cloudinary images',
            'deleted_count': len(public_ids),
            'result': result
        })
        
    except Exception as e:
        logger.error(f"v2 delete-cloudinary-batch error: {e}")
        return jsonify({
            'success': False, 
            'message': str(e),
            'deleted_count': 0
        }), 500

@app.route('/api/face/compare', methods=['POST'])
def compare_faces():
    """Compare two face descriptors using advanced AI"""
    try:
        data = request.get_json()
        
        if not data or 'descriptor1' not in data or 'descriptor2' not in data:
            return jsonify({
                'success': False, 
                'message': 'Missing required data: descriptor1 and descriptor2'
            }), 400
        
        descriptor1 = data['descriptor1']
        descriptor2 = data['descriptor2']
        tolerance = data.get('tolerance', 0.6)
        
        # Validate descriptors
        if len(descriptor1) != 128 or len(descriptor2) != 128:
            return jsonify({
                'success': False, 
                'message': 'Invalid descriptors: must be 128-dimensional'
            }), 400
        
        # Compare faces using advanced AI
        comparison = face_service.compare_faces(descriptor1, descriptor2, tolerance)
        
        return jsonify({
            'success': True,
            'comparison': comparison,
            'threshold_used': tolerance,
            'model_type': 'advanced_deep_learning'
        })
        
    except Exception as e:
        logger.error(f"❌ Error in advanced face comparison: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/face/batch-analyze', methods=['POST'])
def batch_analyze():
    """Batch analyze multiple photos for faces"""
    try:
        data = request.get_json()
        
        if not data or 'photo_urls' not in data:
            return jsonify({
                'success': False, 
                'message': 'No photo URLs provided'
            }), 400
        
        photo_urls = data['photo_urls']
        
        if not isinstance(photo_urls, list) or len(photo_urls) == 0:
            return jsonify({
                'success': False, 
                'message': 'photo_urls must be a non-empty list'
            }), 400
        
        logger.info(f"🔄 Starting batch analysis of {len(photo_urls)} photos")
        
        # Batch analyze photos
        results = face_service.batch_analyze_photos(photo_urls)
        
        return jsonify({
            'success': True,
            'results': results,
            'message': f'Batch analysis completed: {results["faces_found"]}/{results["processed"]} photos contained faces'
        })
        
    except Exception as e:
        logger.error(f"❌ Error in batch analysis: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error"""
    return jsonify({
        'success': False,
        'message': 'File too large. Please upload a smaller image (max 10MB).'
    }), 413

@app.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors"""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        'success': False,
        'message': 'Internal server error occurred in advanced face recognition system'
    }), 500

if __name__ == '__main__':
    print("🚀 Starting FaceMatch Advanced Flask Backend...")
    print("=" * 60)
    print("🎯 INDUSTRIAL-GRADE FACE RECOGNITION SERVICE")
    print("=" * 60)
    print("📡 Server: http://localhost:5000")
    print("🏥 Health check: http://localhost:5000/health")
    print("🔍 Face analysis: POST http://localhost:5000/api/face/analyze")
    print("🎯 Face matching: POST http://localhost:5000/api/face/match")
    print("⚖️  Face comparison: POST http://localhost:5000/api/face/compare")
    print("🔄 Batch analysis: POST http://localhost:5000/api/face/batch-analyze")
    print()
    print("🧠 AI Features:")
    print("   • Deep Learning CNN Models")
    print("   • 128-Dimensional Face Encodings")
    print("   • Industrial-Level Accuracy")
    print("   • Multi-Scale Face Detection")
    print("   • Advanced Image Preprocessing")
    print("   • Robust Duplicate Detection")
    print()
    
    # Initialize advanced face recognition service
    if face_service.initialize():
        print("✅ Advanced Face Recognition initialized successfully!")
        print("🎯 Ready for industrial-grade face recognition!")
    else:
        print("❌ Advanced Face Recognition initialization failed!")
        print("⚠️  Server will start but face recognition won't work")
        print("💡 Make sure to install: pip install face-recognition dlib")
    
    print()
    print("🔥 Starting Advanced Flask Server...")
    print("=" * 60)
    
    # Configure app for production-like settings
    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max file size
    
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
