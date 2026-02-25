const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100, options = {}) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: options.message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator,
    skip: options.skip,
  });
};

// Different limiters for different endpoints
const authLimiter = createRateLimiter(15 * 60 * 1000, 8, {
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});
const authRefreshLimiter = createRateLimiter(15 * 60 * 1000, 60, {
  message: 'Too many token refresh requests. Please try again shortly.',
});

const adminReadLimiter = createRateLimiter(5 * 60 * 1000, 300, {
  keyGenerator: (req) => `${req.user?.id || 'anonymous'}:${req.ip}`,
  message: 'Too many admin read requests. Please slow down.',
});

const adminWriteLimiter = createRateLimiter(10 * 60 * 1000, 80, {
  keyGenerator: (req) => `${req.user?.id || 'anonymous'}:${req.ip}`,
  message: 'Too many admin write actions. Please try again later.',
});

const aiLimiter = createRateLimiter(60 * 60 * 1000, 10); // 10 AI requests per hour

// Payment-specific limiters (stricter for financial operations)
const paymentInitializeLimiter = createRateLimiter(60 * 60 * 1000, 10, {
  keyGenerator: (req) => req.user?.id || req.ip,
}); // 10 payment initiations per hour per user
const paymentVerifyLimiter = createRateLimiter(60 * 60 * 1000, 40, {
  keyGenerator: (req) => req.user?.id || req.ip,
}); // 40 verification attempts per hour per user
const webhookLimiter = createRateLimiter(60 * 60 * 1000, 1000, {
  keyGenerator: (req) => req.ip,
}); // 1000 webhooks per hour per IP

module.exports = {
  authLimiter,
  authRefreshLimiter,
  adminReadLimiter,
  adminWriteLimiter,
  aiLimiter,
  paymentInitializeLimiter,
  paymentVerifyLimiter,
  webhookLimiter,
};
