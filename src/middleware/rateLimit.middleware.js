const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

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


const normalizeIdentifier = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const getUserIdFromRefreshToken = (req) => {
  const headerValue = req.headers?.authorization;
  const headerToken = typeof headerValue === 'string' ? headerValue.split(' ')[1] : null;

  const refreshToken = req.cookies?.refreshToken
    || req.cookies?.refresh_token
    || req.headers?.['x-refresh-token']
    || req.body?.refreshToken
    || req.body?.refresh_token
    || req.body?.token
    || headerToken;

  if (typeof refreshToken !== 'string' || !refreshToken.trim()) return null;

  try {
    const payload = jwt.decode(refreshToken.trim());
    const userId = payload?.id || payload?.sub;
    return normalizeIdentifier(String(userId || ''));
  } catch (error) {
    return null;
  }
};

const getAuthIdentityKey = (req) => {
  const userId = normalizeIdentifier(String(req.user?.id || req.user?._id || ''));
  if (userId) {
    return `user:${userId}`;
  }

  const email = normalizeIdentifier(req.body?.email || req.query?.email);
  if (email) {
    return `email:${email}`;
  }

  return `ip:${req.ip}`;
};

const getAuthRefreshIdentityKey = (req) => {
  const userId = getUserIdFromRefreshToken(req);
  if (userId) {
    return `user:${userId}`;
  }

  return getAuthIdentityKey(req);
};
// Different limiters for different endpoints
const authLimiter = createRateLimiter(15* 60 * 60 * 1000, 8, {
  message: 'Too many authentication attempts. Please try again in 1hr minutes.',
  keyGenerator: getAuthIdentityKey,
});
const authRefreshLimiter = createRateLimiter(15 * 60 * 1000, 60, {
  message: 'Too many token refresh requests. Please try again shortly.',
  keyGenerator: getAuthRefreshIdentityKey,
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
