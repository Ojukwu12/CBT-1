const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const createUser = async (userData) => {
  const existingUser = await User.findOne({ email: userData.email });

  if (existingUser) {
    throw new ApiError(409, 'User with this email already exists');
  }

  const user = new User(userData);
  return await user.save();
};

const getUserById = async (id) => {
  const user = await User.findById(id).select('-__v');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

const getUserByEmail = async (email) => {
  const user = await User.findOne({ email }).select('-__v');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

const getUsersByUniversity = async (universityId, filters = {}) => {
  const query = { universityId, ...filters };
  return await User.find(query)
    .select('-__v')
    .limit(1000);
};

const upgradePlan = async (userId, newPlan, expiryDays = 30) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const user = await User.findByIdAndUpdate(
    userId,
    {
      plan: newPlan,
      planExpiresAt: expiresAt,
    },
    { new: true }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

const downgradePlan = async (userId, newPlan = 'free') => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      plan: newPlan,
      planExpiresAt: null,
    },
    { new: true }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

const updateUserStats = async (userId, statsUpdate) => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $inc: statsUpdate,
    },
    { new: true }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

/**
 * Check if user has access to a feature based on plan
 * Returns error if access denied
 */
const checkFeatureAccess = async (userId, requiredTier) => {
  const user = await getUserById(userId);

  // Check if plan is active
  if (user.planExpiresAt && new Date() > user.planExpiresAt) {
    throw new ApiError(403, 'Your subscription has expired. Please renew to access this feature.');
  }

  // Tier hierarchy
  const tierHierarchy = { free: 0, basic: 1, premium: 2 };
  const userTierLevel = tierHierarchy[user.plan] || 0;
  const requiredTierLevel = tierHierarchy[requiredTier] || 0;

  if (userTierLevel < requiredTierLevel) {
    throw new ApiError(
      403,
      `This feature requires ${requiredTier} plan. Your current plan: ${user.plan}. Upgrade now to access!`
    );
  }

  return user;
};

/**
 * Check daily question limit based on plan
 */
const checkDailyQuestionLimit = async (userId) => {
  const user = await getUserById(userId);

  const dailyLimits = {
    free: 10,
    basic: 50,
    premium: null, // unlimited
  };

  const limit = dailyLimits[user.plan];

  // TODO: Implement in Phase 1 with question attempt tracking
  // For now, just return the limit
  return {
    plan: user.plan,
    dailyLimit: limit,
    isUnlimited: limit === null,
  };
};

/**
 * Check if user can access premium questions
 */
const canAccessQuestion = async (userId, questionAccessLevel) => {
  const user = await getUserById(userId);

  // Check plan expiry
  if (user.planExpiresAt && new Date() > user.planExpiresAt) {
    // Revert to free plan if expired
    user.plan = 'free';
    await user.save();
  }

  // Tier hierarchy
  const tierHierarchy = { free: 0, basic: 1, premium: 2 };
  const userTierLevel = tierHierarchy[user.plan] || 0;
  const questionTierLevel = tierHierarchy[questionAccessLevel] || 0;

  if (userTierLevel < questionTierLevel) {
    return {
      canAccess: false,
      reason: `This question requires ${questionAccessLevel} tier. Your current plan: ${user.plan}`,
      requiredTier: questionAccessLevel,
      currentTier: user.plan,
    };
  }

  return {
    canAccess: true,
    userTier: user.plan,
  };
};

/**
 * Deactivate user account (admin only)
 */
const deactivateUser = async (userId, reason) => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      isActive: false,
    },
    { new: true }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // TODO: Log deactivation reason in Phase 1
  return user;
};

/**
 * Activate user account
 */
const activateUser = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      isActive: true,
    },
    { new: true }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  getUsersByUniversity,
  upgradePlan,
  downgradePlan,
  updateUserStats,
  checkFeatureAccess,
  checkDailyQuestionLimit,
  canAccessQuestion,
  deactivateUser,
  activateUser,
};
