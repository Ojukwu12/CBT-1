const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  topicParamsSchema,
  courseParamsSchema,
  trendsQuerySchema,
  monthlyStatsSchema
} = require('../validators/analytics.validator');

const router = express.Router();

// All analytics routes require authentication
router.use(verifyToken);

/**
 * GET /api/analytics/dashboard
 * Get user's analytics dashboard with overall stats
 * @returns {totalExams, averageScore, strongTopics, weakTopics, stats}
 */
router.get('/dashboard', analyticsController.getDashboard);

/**
 * GET /api/analytics/topic/:topicId
 * Get analytics for a specific topic
 * @params {topicId}
 * @returns {topicName, questionsAttempted, accuracy, trends}
 */
router.get(
  '/topic/:topicId',
  validate(topicParamsSchema, 'params'),
  analyticsController.getTopicAnalytics
);

/**
 * GET /api/analytics/course/:courseId
 * Get analytics for a specific course
 * @params {courseId}
 * @returns {courseName, examsTaken, averageScore, progress}
 */
router.get(
  '/course/:courseId',
  validate(courseParamsSchema, 'params'),
  analyticsController.getCourseAnalytics
);

/**
 * GET /api/analytics/trends
 * Get performance trends over time
 * @query {days}
 * @returns {trendData, summary, average}
 */
router.get(
  '/trends',
  validate(trendsQuerySchema, 'query'),
  analyticsController.getPerformanceTrends
);

/**
 * GET /api/analytics/weak-areas
 * Get analysis of weak topics
 * @returns {weakTopics, recommendations}
 */
router.get('/weak-areas', analyticsController.getWeakAreas);

/**
 * GET /api/analytics/strong-areas
 * Get analysis of strong topics
 * @returns {strongTopics, achievements}
 */
router.get('/strong-areas', analyticsController.getStrongAreas);

/**
 * GET /api/analytics/recommendations
 * Get personalized study recommendations
 * @returns {recommendations, priority, suggestions}
 */
router.get('/recommendations', analyticsController.getRecommendations);

/**
 * GET /api/analytics/monthly
 * Get monthly statistics
 * @query {month} - Optional, format: YYYY-MM
 * @returns {monthlyStats, comparison}
 */
router.get(
  '/monthly',
  validate(monthlyStatsSchema, 'query'),
  analyticsController.getMonthlyStats
);

/**
 * GET /api/analytics/leaderboard/position
 * Get user's leaderboard position
 * @returns {rank, percentile, score}
 */
router.get('/leaderboard/position', analyticsController.getLeaderboardPosition);

module.exports = router;
