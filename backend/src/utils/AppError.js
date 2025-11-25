/**
 * Custom Application Error Class
 * Provides structured error handling with error codes
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error codes
const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PHOTO_NOT_FOUND: 'PHOTO_NOT_FOUND',
  
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  
  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_TAKEN: 'USERNAME_ALREADY_TAKEN',
  ROOM_CODE_EXISTS: 'ROOM_CODE_EXISTS',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Face recognition errors
  NO_FACE_DETECTED: 'NO_FACE_DETECTED',
  FACE_RECOGNITION_SERVICE_UNAVAILABLE: 'FACE_RECOGNITION_SERVICE_UNAVAILABLE',
  FACE_MATCHING_FAILED: 'FACE_MATCHING_FAILED'
};

module.exports = { AppError, ErrorCodes };

