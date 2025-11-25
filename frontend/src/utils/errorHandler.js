/**
 * Centralized error handling utility
 * Provides consistent error handling across the application
 */

// Error code mappings for user-friendly messages
const errorMessages = {
  // Authentication errors
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  INVALID_TOKEN: 'Invalid authentication token. Please log in again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  
  // Authorization errors
  FORBIDDEN: 'You do not have permission to perform this action.',
  INSUFFICIENT_PERMISSIONS: 'You do not have sufficient permissions.',
  
  // Not found errors
  NOT_FOUND: 'The requested resource was not found.',
  ROOM_NOT_FOUND: 'This room does not exist. Please check the room code.',
  USER_NOT_FOUND: 'User not found.',
  PHOTO_NOT_FOUND: 'Photo not found.',
  
  // Validation errors
  VALIDATION_ERROR: 'Please check your input and try again.',
  INVALID_INPUT: 'Invalid input provided.',
  MISSING_REQUIRED_FIELD: 'Please fill in all required fields.',
  INVALID_FILE_TYPE: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 10MB.',
  
  // Conflict errors
  CONFLICT: 'This action conflicts with existing data.',
  EMAIL_ALREADY_EXISTS: 'This email is already registered.',
  USERNAME_ALREADY_TAKEN: 'This username is already taken.',
  ROOM_CODE_EXISTS: 'Room code already exists.',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',
  
  // Server errors
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  DATABASE_ERROR: 'Database error. Please try again later.',
  EXTERNAL_SERVICE_ERROR: 'External service error. Please try again later.',
  
  // Face recognition errors
  NO_FACE_DETECTED: 'No face detected in the image. Please ensure the photo shows a clear, front-facing face with good lighting.',
  FACE_RECOGNITION_SERVICE_UNAVAILABLE: 'Face recognition service is temporarily unavailable. Please try again later.',
  FACE_MATCHING_FAILED: 'Face matching failed. Please try again with a different photo.',
  
  // Network errors
  NETWORK_ERROR: 'Connection failed. Please check your internet connection.',
  TIMEOUT: 'Request timed out. Please try again.',
  
  // Default
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
};

/**
 * Extract error code and message from API response
 */
export function extractError(error) {
  // Handle network errors
  if (!error.response) {
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      return {
        code: 'NETWORK_ERROR',
        message: errorMessages.NETWORK_ERROR,
        originalError: error
      };
    }
    if (error.code === 'ECONNABORTED') {
      return {
        code: 'TIMEOUT',
        message: errorMessages.TIMEOUT,
        originalError: error
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || errorMessages.UNKNOWN_ERROR,
      originalError: error
    };
  }
  
  // Handle API response errors
  const response = error.response;
  const data = response.data || {};
  
  // Check for structured error response
  if (data.error) {
    const errorObj = typeof data.error === 'string' 
      ? { message: data.error, code: 'ERROR' }
      : data.error;
    
    return {
      code: errorObj.code || 'ERROR',
      message: errorMessages[errorObj.code] || errorObj.message || errorMessages.UNKNOWN_ERROR,
      statusCode: errorObj.statusCode || response.status,
      details: errorObj.details,
      originalError: error
    };
  }
  
  // Fallback to status code based messages
  const statusCode = response.status;
  let code = 'ERROR';
  let message = data.message || errorMessages.UNKNOWN_ERROR;
  
  switch (statusCode) {
    case 400:
      code = 'VALIDATION_ERROR';
      message = data.message || errorMessages.VALIDATION_ERROR;
      break;
    case 401:
      code = 'UNAUTHORIZED';
      message = errorMessages.UNAUTHORIZED;
      break;
    case 403:
      code = 'FORBIDDEN';
      message = errorMessages.FORBIDDEN;
      break;
    case 404:
      code = 'NOT_FOUND';
      message = data.message || errorMessages.NOT_FOUND;
      break;
    case 409:
      code = 'CONFLICT';
      message = data.message || errorMessages.CONFLICT;
      break;
    case 429:
      code = 'RATE_LIMIT_EXCEEDED';
      message = errorMessages.RATE_LIMIT_EXCEEDED;
      break;
    case 500:
    case 502:
    case 503:
      code = 'INTERNAL_ERROR';
      message = errorMessages.INTERNAL_ERROR;
      break;
    default:
      code = 'ERROR';
      message = data.message || errorMessages.UNKNOWN_ERROR;
  }
  
  return {
    code,
    message,
    statusCode,
    originalError: error
  };
}

/**
 * Handle error with retry logic
 */
export async function handleErrorWithRetry(
  error,
  retryFn,
  maxRetries = 3,
  retryDelay = 1000,
  retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'EXTERNAL_SERVICE_ERROR']
) {
  const errorInfo = extractError(error);
  
  // Don't retry if error is not retryable
  if (!retryableCodes.includes(errorInfo.code)) {
    throw errorInfo;
  }
  
  // Retry logic
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      return await retryFn();
    } catch (retryError) {
      if (attempt === maxRetries) {
        throw extractError(retryError);
      }
    }
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error) {
  const errorInfo = extractError(error);
  const retryableCodes = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'EXTERNAL_SERVICE_ERROR',
    'FACE_RECOGNITION_SERVICE_UNAVAILABLE'
  ];
  return retryableCodes.includes(errorInfo.code);
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error) {
  const errorInfo = extractError(error);
  return errorInfo.message;
}

/**
 * Get error code
 */
export function getErrorCode(error) {
  const errorInfo = extractError(error);
  return errorInfo.code;
}

export { errorMessages };

