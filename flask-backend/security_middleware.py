"""
Security middleware for Flask backend
"""

from flask import request, jsonify, g
from functools import wraps
import time
import logging
import threading
from collections import defaultdict, deque
import hashlib
import os
def require_service_secret(f):
    """
    Ensure requests include the shared service secret.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check both environment variable names for compatibility
        expected = os.getenv('FLASK_SERVICE_SECRET') or os.getenv('SERVICE_SHARED_SECRET')
        if expected:
            provided = request.headers.get('X-Service-Secret')
            if provided != expected:
                logger.warning(f"Unauthorized service request from {request.remote_addr}")
                return jsonify({'error': 'Unauthorized service request'}), 401
        else:
            # In development, allow requests if secret is not set
            if os.getenv('FLASK_ENV') != 'production':
                logger.warning("FLASK_SERVICE_SECRET not set. Allowing request in development mode.")
            else:
                logger.error("FLASK_SERVICE_SECRET not set in production. Rejecting request.")
                return jsonify({'error': 'Service authentication not configured'}), 500
        return f(*args, **kwargs)
    return decorated_function


# Rate limiting storage with cleanup
class RateLimitStorage:
    """Thread-safe rate limiting storage with automatic cleanup"""
    def __init__(self, max_age=3600):
        self.storage = defaultdict(lambda: deque(maxlen=100))
        self.max_age = max_age
        self.last_cleanup = time.time()
        self._lock = threading.Lock()
    
    def get(self, key):
        with self._lock:
            self._cleanup_if_needed()
            return self.storage[key]
    
    def _cleanup_if_needed(self):
        now = time.time()
        if now - self.last_cleanup > 300:  # Clean every 5 minutes
            self._cleanup_old_entries()
            self.last_cleanup = now
    
    def _cleanup_old_entries(self):
        cutoff = time.time() - self.max_age
        keys_to_remove = []
        for key in self.storage.keys():
            while self.storage[key] and self.storage[key][0] < cutoff:
                self.storage[key].popleft()
            if not self.storage[key]:
                keys_to_remove.append(key)
        for key in keys_to_remove:
            del self.storage[key]

rate_limit_storage = RateLimitStorage()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def rate_limit(max_requests=100, window=60):
    """
    Rate limiting decorator
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client IP
            client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
            if ',' in client_ip:
                client_ip = client_ip.split(',')[0].strip()
            
            # Create rate limit key
            key = f"{client_ip}:{request.endpoint}"
            now = time.time()
            
            # Get storage for this key
            storage = rate_limit_storage.get(key)
            
            # Clean old entries
            while storage and storage[0] <= now - window:
                storage.popleft()
            
            # Check if limit exceeded
            if len(storage) >= max_requests:
                logger.warning(f"Rate limit exceeded for IP: {client_ip}")
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'retry_after': window
                }), 429
            
            # Add current request
            storage.append(now)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_file_upload(f):
    """
    Validate file uploads
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            return jsonify({'error': 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'}), 400
        
        # Check file size (10MB limit)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > 10 * 1024 * 1024:  # 10MB
            return jsonify({'error': 'File too large. Maximum size is 10MB.'}), 400
        
        return f(*args, **kwargs)
    return decorated_function

def validate_json_input(required_fields=None):
    """
    Validate JSON input
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'Invalid JSON data'}), 400
            
            if required_fields:
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    return jsonify({
                        'error': f'Missing required fields: {", ".join(missing_fields)}'
                    }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def log_request(f):
    """
    Log all requests
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        
        logger.info(f"Request: {request.method} {request.path} from {client_ip}")
        
        try:
            result = f(*args, **kwargs)
            duration = time.time() - start_time
            logger.info(f"Response: {request.method} {request.path} completed in {duration:.3f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Error in {request.method} {request.path}: {str(e)} (duration: {duration:.3f}s)")
            raise
    
    return decorated_function

def error_handler(f):
    """
    Global error handler
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Unhandled error in {f.__name__}: {str(e)}", exc_info=True)
            return jsonify({
                'error': 'Internal server error',
                'message': 'An unexpected error occurred'
            }), 500
    
    return decorated_function

def security_headers():
    """
    Add security headers to response
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            response = f(*args, **kwargs)
            
            if hasattr(response, 'headers'):
                response.headers['X-Content-Type-Options'] = 'nosniff'
                response.headers['X-Frame-Options'] = 'DENY'
                response.headers['X-XSS-Protection'] = '1; mode=block'
                response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
                response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            
            return response
        return decorated_function
    return decorator
