/**
 * Standardized API response helpers
 */
const { AppError, ErrorCodes } = require('./AppError');
const { logger } = require('../middleware/security');

/**
 * Send success response
 */
const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = {
    success: true,
    data
  };
  
  if (message) {
    response.message = message;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Send error response with error code
 */
const sendError = (res, message, statusCode = 400, code = 'ERROR', errors = null) => {
  const response = {
    success: false,
    error: {
      message,
      code,
      statusCode
    }
  };
  
  if (errors) {
    response.error.details = errors;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Send error from AppError instance
 */
const sendAppError = (res, error) => {
  const response = {
    success: false,
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    }
  };
  
  if (error.details) {
    response.error.details = error.details;
  }
  
  // Log error for monitoring
  if (error.statusCode >= 500) {
    logger.error('Server error', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
  } else {
    logger.warn('Client error', {
      code: error.code,
      message: error.message
    });
  }
  
  return res.status(error.statusCode).json(response);
};

/**
 * Send paginated response
 */
const sendPaginated = (res, data, pagination, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page * pagination.limit < pagination.total,
      hasPrev: pagination.page > 1
    }
  });
};

module.exports = {
  sendSuccess,
  sendError,
  sendAppError,
  sendPaginated,
  ErrorCodes
};



