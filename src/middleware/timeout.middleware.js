/**
 * Request Timeout Middleware
 * Prevents slow clients from holding server resources indefinitely
 * Different timeout for different operations
 */

const timeout = require('connect-timeout');
const ApiError = require('../utils/ApiError');

/**
 * General timeout: 30 seconds for most requests
 * Applies to all endpoints by default
 */
const generalTimeout = timeout('30s');

/**
 * Long operation timeout: 60 seconds for file uploads/processing
 * Used for endpoints that might take longer
 */
const longOperationTimeout = timeout('60s');

/**
 * Timeout error handler middleware
 * Called after timeout triggers if no response sent
 */
const timeoutHandler = (req, res, next) => {
  // If the request wasn't timed out, continue
  if (!req.timedout) {
    return next();
  }

  // Request timed out
  const error = new ApiError(
    408,
    'Request timeout - operation took too long',
    'REQUEST_TIMEOUT'
  );

  res.status(error.statusCode).json({
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errorCode: error.errorCode || 'UNKNOWN_ERROR',
  });
};

module.exports = {
  generalTimeout,
  longOperationTimeout,
  timeoutHandler,
};
