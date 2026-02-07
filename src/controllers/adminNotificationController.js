const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/apiResponse');
const emailService = require('../services/emailService');
const Logger = require('../utils/logger');

const logger = new Logger('AdminNotificationController');

/**
 * Send bulk email to user segments
 * POST /api/admin/notifications/send-bulk
 */
const sendBulkEmail = asyncHandler(async (req, res) => {
  const { subject, template, variables = {}, filters = {} } = req.body;

  if (!subject || !template) {
    throw new ApiError(400, 'Subject and template are required');
  }

  // Build query based on filters
  const query = {};
  if (filters.plan) query.plan = filters.plan;
  if (filters.role) query.role = filters.role;
  if (filters.universityId) query.universityId = filters.universityId;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;

  // Get recipients
  const recipients = await User.find(query).select('email');

  if (recipients.length === 0) {
    throw new ApiError(404, 'No recipients found matching filters');
  }

  const recipientEmails = recipients.map(u => u.email);

  // Send bulk email
  try {
    const result = await emailService.sendBulkEmail(
      recipientEmails,
      subject,
      template,
      variables
    );

    logger.info(`Bulk email sent by admin - Recipients: ${recipientEmails.length}, Template: ${template}`);

    res.status(200).json(
      new ApiResponse(200, {
        recipientCount: recipientEmails.length,
        messageId: result.messageId || result.transactionId,
        timestamp: result.timestamp,
      }, 'Bulk email sent successfully')
    );
  } catch (err) {
    logger.error('Failed to send bulk email:', err);
    throw new ApiError(500, 'Failed to send bulk email');
  }
});

/**
 * Send announcement to all active users
 * POST /api/admin/notifications/announcement
 */
const sendAnnouncement = asyncHandler(async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    throw new ApiError(400, 'Title and content are required');
  }

  // Get all active users
  const recipients = await User.find({ isActive: true }).select('email');

  if (recipients.length === 0) {
    throw new ApiError(404, 'No active users found');
  }

  const recipientEmails = recipients.map(u => u.email);

  // Send announcement email
  try {
    const result = await emailService.sendBulkEmail(
      recipientEmails,
      `Announcement: ${title}`,
      'announcement',
      {
        title,
        content,
        adminName: req.user.firstName || 'Administrator',
        timestamp: new Date().toLocaleString(),
        appUrl: process.env.APP_URL || 'http://localhost:3000',
      }
    );

    logger.info(`Announcement sent to ${recipientEmails.length} users - Title: ${title}`);

    res.status(200).json(
      new ApiResponse(200, {
        recipientCount: recipientEmails.length,
        messageId: result.messageId || result.transactionId,
        timestamp: result.timestamp,
      }, 'Announcement sent successfully')
    );
  } catch (err) {
    logger.error('Failed to send announcement:', err);
    throw new ApiError(500, 'Failed to send announcement');
  }
});

/**
 * Send system maintenance notification
 * POST /api/admin/notifications/maintenance
 */
const sendMaintenanceNotification = asyncHandler(async (req, res) => {
  const { title, startTime, endTime, impact } = req.body;

  if (!title || !startTime || !endTime) {
    throw new ApiError(400, 'Title, startTime, and endTime are required');
  }

  // Get all active users
  const recipients = await User.find({ isActive: true }).select('email');

  if (recipients.length === 0) {
    throw new ApiError(404, 'No active users found');
  }

  const recipientEmails = recipients.map(u => u.email);

  // Send maintenance notification
  try {
    const result = await emailService.sendBulkEmail(
      recipientEmails,
      `System Maintenance: ${title}`,
      'maintenance-notification',
      {
        title,
        startTime: new Date(startTime).toLocaleString(),
        endTime: new Date(endTime).toLocaleString(),
        impact: impact || 'All services will be temporarily unavailable',
        appUrl: process.env.APP_URL || 'http://localhost:3000',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@universitycbt.com',
      }
    );

    logger.info(`Maintenance notification sent to ${recipientEmails.length} users - Title: ${title}`);

    res.status(200).json(
      new ApiResponse(200, {
        recipientCount: recipientEmails.length,
        messageId: result.messageId || result.transactionId,
        timestamp: result.timestamp,
      }, 'Maintenance notification sent successfully')
    );
  } catch (err) {
    logger.error('Failed to send maintenance notification:', err);
    throw new ApiError(500, 'Failed to send maintenance notification');
  }
});

/**
 * Send plan expiry reminder to users
 * POST /api/admin/notifications/plan-expiry-reminder
 */
const sendPlanExpiryReminder = asyncHandler(async (req, res) => {
  const { daysUntilExpiry = 7 } = req.body;

  // Get users with paid plans expiring soon
  const expiryDate = new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000);
  const startDate = new Date();

  const recipients = await User.find({
    plan: { $in: ['basic', 'premium'] },
    planExpiresAt: {
      $gte: startDate,
      $lte: expiryDate,
    },
    isActive: true,
  }).select('email firstName planExpiresAt');

  if (recipients.length === 0) {
    res.status(200).json(
      new ApiResponse(200, {
        recipientCount: 0,
        message: 'No users with expiring plans in the specified window',
      })
    );
    return;
  }

  const recipientEmails = recipients.map(u => u.email);

  // Send reminder email
  try {
    const result = await emailService.sendBulkEmail(
      recipientEmails,
      'Your Plan Expires Soon - Renew Now',
      'plan-expiry-reminder-admin',
      {
        daysUntilExpiry,
        renewalUrl: `${process.env.APP_URL || 'http://localhost:3000'}/plans`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@universitycbt.com',
      }
    );

    logger.info(`Plan expiry reminder sent to ${recipientEmails.length} users`);

    res.status(200).json(
      new ApiResponse(200, {
        recipientCount: recipientEmails.length,
        messageId: result.messageId || result.transactionId,
        timestamp: result.timestamp,
      }, 'Plan expiry reminder sent successfully')
    );
  } catch (err) {
    logger.error('Failed to send plan expiry reminder:', err);
    throw new ApiError(500, 'Failed to send plan expiry reminder');
  }
});

module.exports = {
  sendBulkEmail,
  sendAnnouncement,
  sendMaintenanceNotification,
  sendPlanExpiryReminder,
};
