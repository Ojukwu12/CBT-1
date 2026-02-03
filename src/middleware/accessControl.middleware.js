/**
 * Access Control Middleware
 * Enforces role-based and tier-based access control
 */

const ApiError = require('../utils/ApiError');

/**
 * Middleware to check user role
 * Usage: route.use(requireRole('admin'))
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    // In Phase 1, user will be attached by auth middleware
    // For now, we're preparing the structure
    const user = req.user;

    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (user.role !== requiredRole && requiredRole !== 'any') {
      throw new ApiError(403, `Access denied. Required role: ${requiredRole}`);
    }

    next();
  };
};

/**
 * Middleware to check user subscription tier
 * Usage: route.use(requireTier('basic')) - allows basic and premium
 */
const requireTier = (minimumTier) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }

    // Check if plan is still active
    if (user.planExpiresAt && new Date() > user.planExpiresAt) {
      throw new ApiError(403, 'Subscription expired. Please renew your plan');
    }

    const tierHierarchy = { free: 0, basic: 1, premium: 2 };
    const userTierLevel = tierHierarchy[user.plan] || 0;
    const requiredTierLevel = tierHierarchy[minimumTier] || 0;

    if (userTierLevel < requiredTierLevel) {
      throw new ApiError(
        403,
        `This feature requires ${minimumTier} plan or higher. Your current plan: ${user.plan}`
      );
    }

    next();
  };
};

/**
 * Middleware to check if user is active
 * Blocks suspended/deactivated users
 */
const requireActive = (req, res, next) => {
  const user = req.user;

  if (!user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been suspended');
  }

  next();
};

/**
 * Middleware to check daily question limit based on tier
 * Usage: route.use(checkDailyLimit)
 */
const checkDailyLimit = async (req, res, next) => {
  const user = req.user;

  if (!user) {
    throw new ApiError(401, 'Authentication required');
  }

  // Get user's questions attempted today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // This is prepared for Phase 1 when we have user attempt logging
  // For now, we just structure it
  const limits = {
    free: 10,
    basic: 50,
    premium: null, // unlimited
  };

  const userLimit = limits[user.plan];

  // Will be validated in Phase 1 with attempt history
  req.userLimit = userLimit;

  next();
};

/**
 * Middleware to track feature usage
 * Logs what features users access (useful for analytics)
 */
const trackFeatureUsage = (featureName) => {
  return (req, res, next) => {
    const user = req.user;

    if (user) {
      // Log will be stored in Phase 1 in FeatureUsageLog collection
      req.featureUsage = {
        userId: user._id,
        feature: featureName,
        tier: user.plan,
        timestamp: new Date(),
      };
    }

    next();
  };
};

module.exports = {
  requireRole,
  requireTier,
  requireActive,
  checkDailyLimit,
  trackFeatureUsage,
};
