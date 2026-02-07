const questionService = require('../services/questionService');
const topicService = require('../services/topicService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { approveRejectSchema } = require('../validators/question.validator');
const emailService = require('../services/emailService');
const User = require('../models/User');
const Logger = require('../utils/logger');

const logger = new Logger('QuestionController');

const getQuestionsByTopic = asyncHandler(async (req, res) => {
  const { topicId } = req.params;
  const { limit = 10, difficulty } = req.query;

  await topicService.getTopicById(topicId);

  const filters = { status: 'approved', isActive: true };
  if (difficulty) filters.difficulty = difficulty;

  const questions = await questionService.getQuestionsByTopic(
    topicId,
    filters
  );
  res.status(200).json({
    success: true,
    data: questions,
    count: questions.length,
  });
});

const getRandomQuestions = asyncHandler(async (req, res) => {
  const { topicId } = req.params;
  const { count = 10, userPlan = 'free' } = req.query;

  await topicService.getTopicById(topicId);

  const questions = await questionService.getRandomQuestions(
    topicId,
    parseInt(count),
    'free',
    userPlan
  );
  res.status(200).json({
    success: true,
    data: questions,
    count: questions.length,
  });
});

const getPendingQuestions = asyncHandler(async (req, res) => {
  const { universityId } = req.params;

  const questions = await questionService.getPendingQuestions(universityId);
  res.status(200).json({
    success: true,
    data: questions,
    count: questions.length,
  });
});

const approveQuestion = [
  validate(approveRejectSchema),
  asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    const { adminId, notes = '' } = req.body;

    const question = await questionService.approveQuestion(
      questionId,
      adminId,
      notes
    );

    // Send approval email to creator
    try {
      const approver = await User.findById(adminId);
      const creator = await User.findOne({ 'createdQuestions': questionId });
      if (creator && approver) {
        await emailService.sendQuestionApprovedEmail(creator, question, approver);
      }
    } catch (err) {
      logger.error('Question approval email failed:', err);
    }

    res.status(200).json({
      success: true,
      data: question,
      message: 'Question approved successfully',
    });
  })
];

const rejectQuestion = [
  validate(approveRejectSchema),
  asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    const { adminId, notes = '' } = req.body;

    const question = await questionService.rejectQuestion(
      questionId,
      adminId,
      notes
    );

    // Send rejection email to creator
    try {
      const creator = await User.findOne({ 'createdQuestions': questionId });
      if (creator) {
        await emailService.sendQuestionRejectedEmail(creator, question, notes);
      }
    } catch (err) {
      logger.error('Question rejection email failed:', err);
    }

    res.status(200).json({
      success: true,
      data: question,
      message: 'Question rejected successfully',
    });
  })
];

const getQuestionStats = asyncHandler(async (req, res) => {
  const { topicId } = req.params;

  await topicService.getTopicById(topicId);

  const stats = await questionService.getQuestionStats(topicId);
  res.status(200).json({
    success: true,
    data: stats,
  });
});

module.exports = {
  getQuestionsByTopic,
  getRandomQuestions,
  getPendingQuestions,
  approveQuestion,
  rejectQuestion,
  getQuestionStats,
};
