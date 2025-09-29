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
        'accuracy_level': 'industrial_grade'
    })

@app.route('/api/face/analyze', methods=['POST'])
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
        
        logger.info(f"🔍 Analyzing uploaded image: {image_file.filename}")
        
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
        logger.error(f"❌ Error analyzing face: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/face/analyze-url', methods=['POST'])
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
