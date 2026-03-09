const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/apiResponse');
const notificationService = require('../services/notificationService');

const listNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false, type } = req.query;

  const result = await notificationService.listForUser({
    userId: req.user.id,
    page,
    limit,
    unreadOnly: unreadOnly === true || unreadOnly === 'true',
    type,
  });

  res.status(200).json(new ApiResponse(200, result, 'Notifications retrieved successfully'));
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await notificationService.getUnreadCount(req.user.id);

  res.status(200).json(new ApiResponse(200, { unreadCount }, 'Unread count retrieved successfully'));
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const updated = await notificationService.markAsRead({
    userId: req.user.id,
    notificationId,
  });

  if (!updated) {
    throw new ApiError(404, 'Notification not found');
  }

  res.status(200).json(new ApiResponse(200, updated, 'Notification marked as read'));
});

const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const modifiedCount = await notificationService.markAllAsRead(req.user.id);

  res.status(200).json(new ApiResponse(200, { modifiedCount }, 'All notifications marked as read'));
});

const registerPushToken = asyncHandler(async (req, res) => {
  const token = (req.body.token || req.body.fcmToken || req.body.deviceToken || req.body.pushToken || '').trim();
  const { platform = 'unknown', deviceId = null } = req.body;

  await notificationService.registerPushToken({
    userId: req.user.id,
    token,
    platform,
    deviceId,
  });

  res.status(200).json(new ApiResponse(200, { registered: true }, 'Push token registered successfully'));
});

const unregisterPushToken = asyncHandler(async (req, res) => {
  const token = (req.body.token || req.body.fcmToken || req.body.deviceToken || req.body.pushToken || '').trim();

  const result = await notificationService.unregisterPushToken({
    userId: req.user.id,
    token,
  });

  res.status(200).json(new ApiResponse(200, result, 'Push token removed successfully'));
});

const notificationListQuerySchema = Joi.object({
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
  unreadOnly: Joi.boolean().optional(),
  type: Joi.string().valid('general', 'announcement', 'maintenance', 'plan', 'system').optional(),
});

const markNotificationParamsSchema = Joi.object({
  notificationId: Joi.string().required(),
});

const registerPushTokenSchema = Joi.object({
  token: Joi.string().trim().min(10).max(500).optional(),
  fcmToken: Joi.string().trim().min(10).max(500).optional(),
  deviceToken: Joi.string().trim().min(10).max(500).optional(),
  pushToken: Joi.string().trim().min(10).max(500).optional(),
  platform: Joi.string().valid('android', 'ios', 'web', 'unknown').optional(),
  deviceId: Joi.string().max(120).allow('', null).optional(),
}).custom((value, helpers) => {
  if (!(value.token || value.fcmToken || value.deviceToken || value.pushToken)) {
    return helpers.error('any.required');
  }

  return value;
}, 'push token required validation');

const unregisterPushTokenSchema = Joi.object({
  token: Joi.string().trim().min(10).max(500).optional(),
  fcmToken: Joi.string().trim().min(10).max(500).optional(),
  deviceToken: Joi.string().trim().min(10).max(500).optional(),
  pushToken: Joi.string().trim().min(10).max(500).optional(),
}).custom((value, helpers) => {
  if (!(value.token || value.fcmToken || value.deviceToken || value.pushToken)) {
    return helpers.error('any.required');
  }

  return value;
}, 'push token required validation');

module.exports = {
  listNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  registerPushToken,
  unregisterPushToken,
  notificationListQuerySchema,
  markNotificationParamsSchema,
  registerPushTokenSchema,
  unregisterPushTokenSchema,
};
