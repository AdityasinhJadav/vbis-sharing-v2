"""
Custom exception classes for better error handling
"""
from typing import Optional, Dict, Any


class FaceRecognitionError(Exception):
    """Base exception for face recognition errors"""
    def __init__(self, message: str, code: str = "FACE_RECOGNITION_ERROR", status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NoFaceDetectedError(FaceRecognitionError):
    """Raised when no face is detected in an image"""
    def __init__(self, message: str = "No face detected in the image", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "NO_FACE_DETECTED", 200, details)


class MultipleFacesDetectedError(FaceRecognitionError):
    """Raised when multiple faces are detected but only one is expected"""
    def __init__(self, message: str = "Multiple faces detected. Please provide an image with a single face", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "MULTIPLE_FACES_DETECTED", 400, details)


class ModelNotInitializedError(FaceRecognitionError):
    """Raised when face recognition model is not initialized"""
    def __init__(self, message: str = "Face recognition service is not initialized", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "SERVICE_UNAVAILABLE", 503, details)


class InvalidImageError(FaceRecognitionError):
    """Raised when image is invalid or cannot be processed"""
    def __init__(self, message: str = "Invalid image format or corrupted image", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "INVALID_IMAGE", 400, details)


class EmbeddingDimensionMismatchError(FaceRecognitionError):
    """Raised when embedding dimensions don't match expected dimensions"""
    def __init__(self, message: str = "Embedding dimension mismatch", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "EMBEDDING_DIMENSION_MISMATCH", 400, details)


class EventNotFoundError(FaceRecognitionError):
    """Raised when event/room is not found in FAISS index"""
    def __init__(self, message: str = "Event not found in index", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "EVENT_NOT_FOUND", 404, details)


class IngestionError(FaceRecognitionError):
    """Raised when photo ingestion fails"""
    def __init__(self, message: str = "Failed to ingest photo", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "INGESTION_FAILED", 500, details)


class RateLimitError(FaceRecognitionError):
    """Raised when rate limit is exceeded"""
    def __init__(self, message: str = "Rate limit exceeded", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "RATE_LIMIT_EXCEEDED", 429, details)


# Error code constants
ERROR_CODES = {
    "NO_FACE_DETECTED": "NO_FACE_DETECTED",
    "MULTIPLE_FACES_DETECTED": "MULTIPLE_FACES_DETECTED",
    "SERVICE_UNAVAILABLE": "SERVICE_UNAVAILABLE",
    "INVALID_IMAGE": "INVALID_IMAGE",
    "EMBEDDING_DIMENSION_MISMATCH": "EMBEDDING_DIMENSION_MISMATCH",
    "EVENT_NOT_FOUND": "EVENT_NOT_FOUND",
    "INGESTION_FAILED": "INGESTION_FAILED",
    "RATE_LIMIT_EXCEEDED": "RATE_LIMIT_EXCEEDED",
    "INTERNAL_ERROR": "INTERNAL_ERROR"
}

