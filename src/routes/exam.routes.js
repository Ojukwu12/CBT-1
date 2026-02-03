const express = require('express');
const examController = require('../controllers/examController');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  examStartSchema,
  submitAnswerSchema,
  examParamsSchema,
  historyQuerySchema
} = require('../validators/exam.validator');

const router = express.Router();

// All exam routes require authentication
router.use(verifyToken);

/**
 * POST /api/exams/start
 * Start a new exam session
 * @body {examType, courseId?, topicIds?, totalQuestions?, durationMinutes?}
 * @returns {examSessionId, questions, durationMinutes, etc}
 */
router.post('/start', validate(examStartSchema), examController.startExam);

/**
 * POST /api/exams/:examSessionId/answer
 * Submit answer to a question
 * @params {examSessionId}
 * @body {questionId, selectedAnswer, timeSpentSeconds?}
 * @returns {isCorrect, feedback, progress}
 */
router.post(
  '/:examSessionId/answer',
  validate(examParamsSchema, 'params'),
  validate(submitAnswerSchema),
  examController.submitAnswer
);

/**
 * GET /api/exams/:examSessionId/summary
 * Get current exam progress summary
 * @params {examSessionId}
 * @returns {status, answeredQuestions, correctAnswers, remainingTime}
 */
router.get(
  '/:examSessionId/summary',
  validate(examParamsSchema, 'params'),
  examController.getExamSummary
);

/**
 * POST /api/exams/:examSessionId/submit
 * Submit exam and calculate final score
 * @params {examSessionId}
 * @returns {score, percentage, isPassed, summary}
 */
router.post(
  '/:examSessionId/submit',
  validate(examParamsSchema, 'params'),
  examController.submitExam
);

/**
 * GET /api/exams/:examSessionId/results
 * Get detailed exam results with question breakdown
 * @params {examSessionId}
 * @returns {score, percentage, isPassed, detailedResults}
 */
router.get(
  '/:examSessionId/results',
  validate(examParamsSchema, 'params'),
  examController.getExamResults
);

/**
 * GET /api/exams/history
 * Get user's exam history with pagination
 * @query {page, limit}
 * @returns {examHistory, pagination}
 */
router.get(
  '/history',
  validate(historyQuerySchema, 'query'),
  examController.getExamHistory
);

/**
 * GET /api/exams/active
 * Get active/in-progress exam (for resuming)
 * @returns {examSessionId, progress, remainingTime} or 404
 */
router.get('/active', examController.getActiveExam);

/**
 * POST /api/exams/:examSessionId/abandon
 * Abandon an in-progress exam
 * @params {examSessionId}
 * @returns {success message}
 */
router.post(
  '/:examSessionId/abandon',
  validate(examParamsSchema, 'params'),
  examController.abandonExam
);

module.exports = router;
