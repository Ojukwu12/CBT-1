const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const Joi = require('joi');

const leaderboardParamsSchema = Joi.object({
  universityId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  courseId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  month: Joi.string().regex(/^\d{4}-\d{2}$/).optional()
});

const leaderboardQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(500).default(100),
  page: Joi.number().integer().min(1).default(1)
});

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/leaderboards/global
 * Get global leaderboard (top 100 students)
 */
router.get('/global', validate(leaderboardQuerySchema, 'query'), leaderboardController.getGlobalLeaderboard);

/**
 * GET /api/leaderboards/university/:universityId
 * Get university-specific leaderboard
 */
router.get('/university/:universityId', validate(leaderboardParamsSchema, 'params'), validate(leaderboardQuerySchema, 'query'), leaderboardController.getUniversityLeaderboard);

/**
 * GET /api/leaderboards/course/:courseId
 * Get course-specific leaderboard
 */
router.get('/course/:courseId', validate(leaderboardParamsSchema, 'params'), validate(leaderboardQuerySchema, 'query'), leaderboardController.getCourseLeaderboard);

/**
 * GET /api/leaderboards/monthly/:month
 * Get monthly leaderboard (format: YYYY-MM)
 */
router.get('/monthly/:month', validate(leaderboardParamsSchema, 'params'), validate(leaderboardQuerySchema, 'query'), leaderboardController.getMonthlyLeaderboard);

module.exports = router;
