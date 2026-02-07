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
  const { page = 1, limit = 20, plan, role, isActive, search, universityId } = req.query;

  const skip = (page - 1) * limit;
  const query = {};

  if (plan) query.plan = plan;
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (universityId) query.universityId = universityId;

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
const downgradePlan = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason = 'Policy violation' } = req.body;

  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const oldPlan = user.plan;
  user.plan = 'free';
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
        oldPlan,
        newPlan: 'free',
        reason,
        appUrl: env.APP_URL || 'http://localhost:3000',
      }
    );
  } catch (err) {
    logger.error('Plan downgrade notification email failed:', err);
  }

  logger.info(`User plan downgraded: ${user.email} - ${oldPlan} -> free`);

  // Log plan downgrade
  await auditLogService.logPlanDowngrade(
    userId,
    oldPlan,
    'free',
    reason,
    req.user.id
  );

  res.status(200).json(
    new ApiResponse(200, user, 'User plan downgraded to free successfully')
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

module.exports = {
  getAllUsers,
  getUser,
  banUser,
  unbanUser,
  changeUserRole,
  downgradePlan,
  sendNotificationToUser,
};
