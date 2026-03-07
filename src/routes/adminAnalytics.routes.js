const express = require('express');
const router = express.Router();
const AdminAnalyticsController = require('../controllers/adminAnalyticsController');
const AdminNotificationController = require('../controllers/adminNotificationController');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { adminReadLimiter, adminWriteLimiter } = require('../middleware/rateLimit.middleware');

// Admin role verification middleware
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }
  next();
};

// Validators
const universityParamsSchema = Joi.object({
  universityId: Joi.string().required()
});

const reportParamsSchema = Joi.object({
  type: Joi.string().valid('performance', 'users', 'revenue', 'questions', 'overview').required()
});

const exportQuerySchema = Joi.object({
  format: Joi.string().valid('json', 'csv').default('json')
});

const sendBulkEmailSchema = Joi.object({
  subject: Joi.string().required().min(5).max(200),
  template: Joi.string().required(),
  variables: Joi.object().optional(),
  filters: Joi.object().optional(),
});

const sendAnnouncementSchema = Joi.object({
  title: Joi.string().required().min(5).max(100),
  content: Joi.string().required().min(10).max(2000),
});

const sendMaintenanceSchema = Joi.object({
  title: Joi.string().required().min(5).max(100),
  startTime: Joi.date().required(),
  endTime: Joi.date().required(),
  impact: Joi.string().optional().max(500),
});

const sendPlanExpiryReminderSchema = Joi.object({
  daysUntilExpiry: Joi.number().optional().default(7),
});

const sendAppNotificationSchema = Joi.object({
  title: Joi.string().required().min(3).max(120),
  message: Joi.string().required().min(3).max(2000),
  type: Joi.string().valid('general', 'announcement', 'maintenance', 'plan', 'system').default('general'),
  channels: Joi.array().items(Joi.string().valid('in_app', 'push')).min(1).default(['in_app']),
  filters: Joi.object({
    plan: Joi.string().valid('free', 'basic', 'premium').optional(),
    role: Joi.string().valid('student', 'admin').optional(),
    universityId: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
  }).optional(),
  data: Joi.object().optional(),
  expiresAt: Joi.date().allow(null).optional(),
});

// Analytics Routes
router.get('/overview', verifyToken, isAdmin, adminReadLimiter, AdminAnalyticsController.getOverviewStats);
router.get('/users', verifyToken, isAdmin, adminReadLimiter, AdminAnalyticsController.getUserMetrics);
router.get('/questions', verifyToken, isAdmin, adminReadLimiter, AdminAnalyticsController.getQuestionPerformance);
router.get('/exams', verifyToken, isAdmin, adminReadLimiter, AdminAnalyticsController.getExamStatistics);
router.get('/revenue', verifyToken, isAdmin, adminReadLimiter, AdminAnalyticsController.getRevenueData);
router.get('/university/:universityId', verifyToken, isAdmin, adminReadLimiter, validate(universityParamsSchema), AdminAnalyticsController.getUniversityStats);
router.get('/export', verifyToken, isAdmin, adminReadLimiter, validate(exportQuerySchema), AdminAnalyticsController.exportData);
router.get('/report/:type', verifyToken, isAdmin, adminReadLimiter, validate(reportParamsSchema), AdminAnalyticsController.generateReport);

// Notification Routes
router.post('/notifications/send-bulk', verifyToken, isAdmin, adminWriteLimiter, validate(sendBulkEmailSchema), AdminNotificationController.sendBulkEmail);
router.post('/notifications/send', verifyToken, isAdmin, adminWriteLimiter, validate(sendAppNotificationSchema), AdminNotificationController.sendAppNotification);
router.post('/notifications/announcement', verifyToken, isAdmin, adminWriteLimiter, validate(sendAnnouncementSchema), AdminNotificationController.sendAnnouncement);
router.post('/notifications/maintenance', verifyToken, isAdmin, adminWriteLimiter, validate(sendMaintenanceSchema), AdminNotificationController.sendMaintenanceNotification);
router.post('/notifications/plan-expiry-reminder', verifyToken, isAdmin, adminWriteLimiter, validate(sendPlanExpiryReminderSchema), AdminNotificationController.sendPlanExpiryReminder);

module.exports = router;
