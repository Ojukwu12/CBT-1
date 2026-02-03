const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different limiters for different endpoints
const generalLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 min
const authLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 min (Phase 1)
const aiLimiter = createRateLimiter(60 * 60 * 1000, 10); // 10 AI requests per hour

module.exports = {
  generalLimiter,
  authLimiter,
  aiLimiter,
};
