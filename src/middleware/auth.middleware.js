const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const Logger = require('../utils/logger');
const { env } = require('../config/env');

const logger = new Logger('AuthMiddleware');

/**
 * Verify JWT token and attach user info to req.user
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next(new ApiError(401, 'No authorization header provided'));
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return next(new ApiError(401, 'No token provided'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
    const normalizedUserId = decoded?.id || decoded?._id || decoded?.userId;

    if (!normalizedUserId) {
      return next(new ApiError(401, 'Invalid token payload'));
    }

    req.user = {
      ...decoded,
      id: normalizedUserId.toString(),
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new ApiError(401, 'Token has expired'));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(401, 'Invalid token'));
    }
    logger.error('Token verification failed', err);
    next(new ApiError(401, 'Token verification failed'));
  }
};

/**
 * Generate JWT token
 * @param {Object} payload - User data to encode
 * @param {String} expiresIn - Token expiry (default: env.JWT_ACCESS_TOKEN_TTL or 15m)
 */
const generateToken = (payload, expiresIn = env.JWT_ACCESS_TOKEN_TTL || '15m') => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: 'HS256',
  });
};

module.exports = {
  verifyToken,
  generateToken,
};
