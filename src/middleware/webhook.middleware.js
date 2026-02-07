/**
 * Webhook security middleware
 * Validates webhook requests from authorized sources
 */

const ApiError = require('../utils/ApiError');
const Logger = require('../utils/logger');

const logger = new Logger('WebhookSecurity');

/**
 * Optional middleware to validate webhook comes from Paystack IP
 * This is a secondary check - primary security is the HMAC signature
 */
const validatePaystackIP = (req, res, next) => {
  try {
    // Get client IP from various possible headers
    const clientIP = 
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      req.ip ||
      req.connection.remoteAddress;

    // Known Paystack IP ranges (maintained - should be updated periodically)
    const paystackIPs = [
      '52.88.84.215',
      '52.15.241.248',
      '54.80.249.152',
      '34.203.37.255',
    ];

    // Allow localhost for development/testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isLocalhost = clientIP === '::1' || clientIP === '127.0.0.1' || clientIP === 'localhost';

    if (isLocalhost && isDevelopment) {
      return next();
    }

    // In production, optionally enforce IP check (can be disabled if needed)
    const enforceIPCheck = process.env.WEBHOOK_ENFORCE_IP_CHECK === 'true';
    if (enforceIPCheck && !paystackIPs.includes(clientIP)) {
      logger.warn(`Webhook rejected from unauthorized IP: ${clientIP}`);
      throw new ApiError(403, 'Unauthorized webhook source');
    }

    // Pass IP info to controller for logging
    req.webhookClientIP = clientIP;
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    logger.error('Error validating webhook IP', err);
    throw new ApiError(400, 'Invalid webhook request');
  }
};

module.exports = {
  validatePaystackIP,
};
