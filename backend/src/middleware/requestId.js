/**
 * Request ID middleware for tracking requests across services
 */

const { v4: uuidv4 } = require('uuid');

const requestIdMiddleware = (req, res, next) => {
  // Get request ID from header or generate new one
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Attach to request object
  req.id = requestId;
  
  // Add to response header
  res.setHeader('X-Request-ID', requestId);
  
  // Add to logger context if available
  if (req.logger) {
    req.logger = req.logger.child({ requestId });
  }
  
  next();
};

module.exports = requestIdMiddleware;



