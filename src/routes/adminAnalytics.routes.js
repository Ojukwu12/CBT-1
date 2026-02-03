const express = require('express');
const router = express.Router();
const AdminAnalyticsController = require('../controllers/adminAnalyticsController');
const { verifyToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const Joi = require('joi');

// Admin role verification middleware
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
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

// Routes
router.get('/overview', verifyToken, isAdmin, AdminAnalyticsController.getOverviewStats);
router.get('/users', verifyToken, isAdmin, AdminAnalyticsController.getUserMetrics);
router.get('/questions', verifyToken, isAdmin, AdminAnalyticsController.getQuestionPerformance);
router.get('/exams', verifyToken, isAdmin, AdminAnalyticsController.getExamStatistics);
router.get('/revenue', verifyToken, isAdmin, AdminAnalyticsController.getRevenueData);
router.get('/university/:universityId', verifyToken, isAdmin, validate(universityParamsSchema), AdminAnalyticsController.getUniversityStats);
router.get('/export', verifyToken, isAdmin, validate(exportQuerySchema), AdminAnalyticsController.exportData);
router.get('/report/:type', verifyToken, isAdmin, validate(reportParamsSchema), AdminAnalyticsController.generateReport);

module.exports = router;
