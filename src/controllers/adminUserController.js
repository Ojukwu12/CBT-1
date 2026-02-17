const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/apiResponse');
const emailService = require('../services/emailService');
const auditLogService = require('../services/auditLogService');
const { env } = require('../config/env');
const Logger = require('../utils/logger');

const logger = new Logger('AdminUserController');

/**
 * Get all users with filtering
 * GET /api/admin/users
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, plan, role, isActive, search } = req.query;

  const skip = (page - 1) * limit;
  const query = {};

  if (plan) query.plan = plan;
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, {
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    }, 'Users retrieved successfully')
  );
});

/**
 * Get single user
 * GET /api/admin/users/:userId
 */
const getUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json(
    new ApiResponse(200, user, 'User retrieved successfully')
  );
});

/**
 * Ban/suspend a user
 * POST /api/admin/users/:userId/ban
 */
const banUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason, duration = null } = req.body;

  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!reason) {
    throw new ApiError(400, 'Ban reason is required');
  }

  // Calculate unban date based on duration
  let unbanDate = null;
  if (duration && duration !== 'permanent') {
    const durationMap = {
      '7days': 7 * 24 * 60 * 60 * 1000,
      '30days': 30 * 24 * 60 * 60 * 1000,
      '90days': 90 * 24 * 60 * 60 * 1000,
    };
    unbanDate = new Date(Date.now() + (durationMap[duration] || 0));
  }

  // Update user
  user.isActive = false;
  user.banReason = reason;
  user.bannedAt = new Date();
  user.banDuration = duration;
  if (unbanDate) {
    user.unbanDate = unbanDate;
  }

  await user.save();

  // Send ban notification email
  try {
    await emailService.sendUserBanNotificationEmail(user, reason, duration);
  } catch (err) {
    logger.error('Ban notification email failed:', err);
  }

  // Send alert to admins
  try {
    await emailService.sendAdminAlertEmail(
      req.user.email,
      'info',
      'User Banned',
      `User ${user.email} has been banned. Reason: ${reason}`
    );
  } catch (err) {
    logger.error('Admin alert email failed:', err);
  }

  logger.info(`User banned: ${user.email} - Reason: ${reason}`);

  // Log user ban action
  await auditLogService.logUserBan(
    userId,
    reason,
    duration,
    req.user.id,
    req.ip || req.connection.remoteAddress
  );

  res.status(200).json(
    new ApiResponse(200, user, `User banned successfully`)
  );
});

/**
 * Unban a user
 * POST /api/admin/users/:userId/unban
 */
const unbanUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.isActive) {
    throw new ApiError(400, 'User is not banned');
  }

  // Update user
  user.isActive = true;
  user.banReason = null;
  user.bannedAt = null;
  user.unbanDate = null;
  user.banDuration = null;

  await user.save();

  // Send unban notification email
  try {
    await emailService.send(
      user.email,
      'Account Reactivated',
      'account-reactivated',
      {
        firstName: user.firstName,
        appUrl: env.APP_URL || 'http://localhost:3000',
      }
    );
  } catch (err) {
    logger.error('Unban notification email failed:', err);
  }

  logger.info(`User unbanned: ${user.email}`);

  // Log user unban action
  await auditLogService.logUserUnban(
    userId,
    req.user.id,
    req.ip || req.connection.remoteAddress
  );

  res.status(200).json(
    new ApiResponse(200, user, 'User unbanned successfully')
  );
});

/**
 * Change user role
 * POST /api/admin/users/:userId/role
 */
const changeUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { newRole } = req.body;

  if (!['student', 'admin'].includes(newRole)) {
    throw new ApiError(400, 'Invalid role. Must be student or admin');
  }

  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const oldRole = user.role;
  user.role = newRole;
  await user.save();

  // Send notification email
  try {
    const roleChangedTemplate = newRole === 'admin'
      ? 'role-upgraded-to-admin'
      : 'role-changed-to-student';

    await emailService.send(
      user.email,
      `Your Role Has Been Changed to ${newRole}`,
      roleChangedTemplate,
      {
        firstName: user.firstName,
        oldRole,
        newRole,
        appUrl: env.APP_URL || 'http://localhost:3000',
      }
    );
  } catch (err) {
    logger.error('Role change notification email failed:', err);
  }

  logger.info(`User role changed: ${user.email} - ${oldRole} -> ${newRole}`);

  // Log user role change
  await auditLogService.logUserRoleChange(
    userId,
    oldRole,
    newRole,
    req.user.id,
    req.ip || req.connection.remoteAddress
  );

  res.status(200).json(
    new ApiResponse(200, user, `User role changed to ${newRole} successfully`)
  );
});

/**
 * Downgrade user plan
 * POST /api/admin/users/:userId/downgrade-plan
 */
/**
 * Change user plan (unified endpoint)
 * POST /api/admin/users/:userId/change-plan
 * Admin selects any plan (free/basic/premium) and system handles upgrade/downgrade
 */
const changePlan = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { plan: newPlan, expiryDays = 30, reason } = req.body;

  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const currentPlan = user.plan || 'free';
  
  // If same plan, return success without change
  if (currentPlan === newPlan) {
    return res.status(200).json(
      new ApiResponse(200, user, `User is already on ${newPlan} plan`)
    );
  }

  const planHierarchy = { 'free': 0, 'basic': 1, 'premium': 2 };
  const isUpgrade = planHierarchy[newPlan] > planHierarchy[currentPlan];
  
  // Archive current plan to previous plan tracking
  if (currentPlan !== 'free') {
    user.previousPlan = currentPlan;
    user.previousPlanExpiresAt = user.planExpiresAt;
  }

  // Add to plan history
  if (!user.planHistory) {
    user.planHistory = [];
  }

  user.planHistory.push({
    plan: currentPlan,
    startDate: user.planStartDate || new Date(user.createdAt),
    endDate: new Date(),
    expiryDate: user.planExpiresAt,
    changedAt: new Date(),
    changedBy: req.user.id,
  });

  // Update plan
  user.plan = newPlan;
  user.planStartDate = new Date(); // Track when new plan started
  
  if (isUpgrade) {
    // Set expiry for upgrades
    user.planExpiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  } else {
    // Clear expiry for downgrades to free
    user.planExpiresAt = null;
  }

  await user.save();

  // Send notification email
  try {
    const emailTemplate = isUpgrade ? 'plan-upgrade-admin' : 'plan-downgrade-admin';
    await emailService.send(
      user.email,
      `Plan ${isUpgrade ? 'Upgraded' : 'Downgraded'}`,
      emailTemplate,
      {
        firstName: user.firstName,
        oldPlan: currentPlan,
        newPlan,
        reason: reason || '',
        expiryDays: isUpgrade ? expiryDays : null,
        appUrl: env.APP_URL || 'http://localhost:3000',
      }
    );
  } catch (err) {
    logger.error(`Plan change notification email failed for user ${userId}:`, err);
    // Don't throw error, plan was changed successfully
  }

  logger.info(`User plan changed: ${user.email} - ${currentPlan} -> ${newPlan}`);

  // Log plan change
  await auditLogService.logPlanDowngrade(
    userId,
    currentPlan,
    newPlan,
    reason || 'Plan change via admin',
    req.user.id
  );

  const action = isUpgrade ? 'upgraded to' : 'downgraded to';
  res.status(200).json(
    new ApiResponse(200, user, `User ${action} ${newPlan} plan successfully`)
  );
});

/**
 * Downgrade user plan (legacy endpoint)
 * POST /api/admin/users/:userId/downgrade-plan
 * Deprecated: Use /change-plan instead
 */
const downgradePlan = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const currentPlan = user.plan || 'free';
  
  // If already free, no change
  if (currentPlan === 'free') {
    return res.status(200).json(
      new ApiResponse(200, user, 'User is already on free plan')
    );
  }

  // Archive current plan to previous plan tracking
  user.previousPlan = currentPlan;
  user.previousPlanExpiresAt = user.planExpiresAt;

  // Add to plan history
  if (!user.planHistory) {
    user.planHistory = [];
  }

  user.planHistory.push({
    plan: currentPlan,
    startDate: user.planStartDate || new Date(user.createdAt),
    endDate: new Date(),
    expiryDate: user.planExpiresAt,
    changedAt: new Date(),
    changedBy: req.user.id,
  });

  // Downgrade to free plan - no expiry
  user.plan = 'free';
  user.planStartDate = new Date();
  user.planExpiresAt = null;

  await user.save();

  // Send notification email
  try {
    await emailService.send(
      user.email,
      'Plan Downgraded',
      'plan-downgrade-admin',
      {
        firstName: user.firstName,
        oldPlan: currentPlan,
        newPlan: 'free',
        reason: reason || 'Plan downgrade',
        appUrl: env.APP_URL || 'http://localhost:3000',
      }
    );
  } catch (err) {
    logger.error(`Plan downgrade notification email failed for user ${userId}:`, err);
  }

  logger.info(`User plan downgraded to free: ${user.email}`);

  // Log plan downgrade
  await auditLogService.logPlanDowngrade(
    userId,
    currentPlan,
    'free',
    reason || 'Plan downgrade via admin',
    req.user.id
  );

  res.status(200).json(
    new ApiResponse(200, user, 'User downgraded to free plan successfully')
  );
});

/**
 * Send notification email to user by admin
 * POST /api/admin/users/:userId/send-notification
 */
const sendNotificationToUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { subject, message } = req.body;

  if (!subject || !message) {
    throw new ApiError(400, 'Subject and message are required');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Send custom notification email
  try {
    await emailService.send(
      user.email,
      subject,
      'admin-custom-notification',
      {
        firstName: user.firstName,
        subject,
        message,
        senderName: req.user.firstName || 'Administrator',
        appUrl: env.APP_URL || 'http://localhost:3000',
      }
    );
  } catch (err) {
    logger.error('Custom notification email failed:', err);
    throw new ApiError(500, 'Failed to send notification email');
  }

  logger.info(`Admin notification sent to user: ${user.email}`);

  res.status(200).json(
    new ApiResponse(200, { sent: true }, 'Notification sent successfully')
  );
});

/**
 * Get user plan history
 * GET /api/admin/users/:userId/plan-history
 */
const getPlanHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('planHistory previousPlan previousPlanExpiresAt plan planExpiresAt');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const planHistory = {
    currentPlan: user.plan || 'free',
    currentPlanExpiresAt: user.planExpiresAt,
    previousPlan: user.previousPlan,
    previousPlanExpiresAt: user.previousPlanExpiresAt,
    allTransitions: user.planHistory || []
  };

  res.status(200).json(
    new ApiResponse(200, planHistory, 'Plan history retrieved successfully')
  );
});

/**
 * Get current admin user's profile
 * GET /api/admin/users/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  res.status(200).json(new ApiResponse(200, user, 'Current admin user retrieved successfully'));
});

module.exports = {
  getAllUsers,
  getUser,
  banUser,
  unbanUser,
  changeUserRole,
  changePlan,
  downgradePlan,
  sendNotificationToUser,
  getPlanHistory,
  getMe,
};
