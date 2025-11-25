/**
 * Validation schemas using Joi
 * Provides consistent validation across all endpoints
 */
const Joi = require('joi');

// Common validation patterns
const patterns = {
  email: Joi.string().email().lowercase().trim(),
  password: Joi.string().min(6).max(128),
  username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_-]+$/),
  uuid: Joi.string().uuid(),
  roomCode: Joi.string().length(6).pattern(/^[A-Z0-9]+$/).uppercase(),
  date: Joi.date().iso(),
  url: Joi.string().uri()
};

// Validation schemas
const schemas = {
  // Auth schemas
  signup: Joi.object({
    email: patterns.email.required(),
    password: patterns.password.required(),
    role: Joi.string().valid('organizer', 'attendee').default('attendee'),
    username: patterns.username.optional()
  }),
  
  login: Joi.object({
    email: patterns.email.required(),
    password: Joi.string().required()
  }),
  
  updateUsername: Joi.object({
    username: patterns.username.required()
  }),
  
  // Room schemas
  createRoom: Joi.object({
    name: Joi.string().min(3).max(100).trim().required(),
    description: Joi.string().max(500).trim().optional().allow(''),
    eventDate: patterns.date.optional()
  }),
  
  joinRoom: Joi.object({
    code: patterns.roomCode.required()
  }),
  
  // Photo schemas
  photoQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'updatedAt').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Validate request data against schema
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: errors
        }
      });
    }
    
    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
}

/**
 * Validate query parameters
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: errors
        }
      });
    }
    
    req.query = value;
    next();
  };
}

module.exports = {
  schemas,
  validate,
  validateQuery,
  patterns
};

