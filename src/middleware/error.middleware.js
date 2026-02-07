const ApiError = require('../utils/ApiError');
const Logger = require('../utils/logger');
const { env } = require('../config/env');

const logger = new Logger('ErrorHandler', env.NODE_ENV === 'development');

/**
 * Handle MongoDB/Mongoose errors
 */
const handleMongooseError = (err) => {
  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    return new ApiError(409, message, [{
      field,
      message,
      value: err.keyValue[field],
    }]);
  }

  // Validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value,
    }));
    return new ApiError(400, 'Validation error', details);
  }

  // Cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return new ApiError(400, `Invalid ${err.kind} format`, [{
      field: err.path,
      message: `Invalid ${err.kind} format`,
      value: err.value,
    }]);
  }

  // Generic mongoose error
  return new ApiError(500, 'Database operation failed');
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || undefined;

  // Log the error
  logger.error(`[${req.method} ${req.path}]`, err, {
    requestId: req.id,
    statusCode,
  });

  // Handle custom ApiError
  if (err instanceof ApiError) {
    return res.status(statusCode).json(err.toJSON());
  }

  // Handle Mongoose/MongoDB errors
  if (err.name === 'MongoServerError' || err.name === 'ValidationError' || err.name === 'CastError') {
    const apiError = handleMongooseError(err);
    return res.status(apiError.statusCode).json(apiError.toJSON());
  }

  // Development: show stack trace
  if (env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      details,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  }

  // Production: hide sensitive details
  // Return generic message for 5xx errors to prevent information disclosure
  const isClientError = statusCode >= 400 && statusCode < 500;
  const productionMessage = isClientError ? message : 'Something went wrong. Please try again later.';

  res.status(statusCode).json({
    success: false,
    statusCode,
    message: productionMessage,
    // Include requestId for support team to track down issues
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
};

module.exports = errorHandler;
