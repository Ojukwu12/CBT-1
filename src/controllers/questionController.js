const questionService = require('../services/questionService');
const topicService = require('../services/topicService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { approveRejectSchema, createQuestionSchema, listQuestionsSchema } = require('../validators/question.validator');
const emailService = require('../services/emailService');
const User = require('../models/User');
const Logger = require('../utils/logger');
const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');

const logger = new Logger('QuestionController');

const createQuestion = [
  validate(createQuestionSchema),
  asyncHandler(async (req, res) => {
    const { courseId, universityId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    if (universityId && course.universityId?.toString() !== universityId) {
      throw new ApiError(400, 'University does not match course');
    }

    const question = await questionService.createQuestion({
      ...req.body,
      universityId: course.universityId,
      departmentId: course.departmentId,
      level: course.level,
      createdBy: req.user?.id,
    });

    res.status(201).json({
      success: true,
      data: question,
      message: 'Question created successfully',
    });
  })
];

const listQuestions = [
  validate(listQuestionsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const {
      universityId,
      courseId,
      departmentId,
      topicId,
      createdBy,
      level,
      difficulty,
      status,
      accessLevel,
      source,
      q,
      page = 1,
      limit = 20,
    } = req.query;

    const filters = {
      ...(universityId && { universityId }),
      ...(courseId && { courseId }),
      ...(departmentId && { departmentId }),
      ...(topicId && { topicId }),
      ...(createdBy && { createdBy }),
      ...(level && { level: Number(level) }),
      ...(difficulty && { difficulty }),
      ...(status && { status }),
      ...(accessLevel && { accessLevel }),
      ...(source && { source }),
    };

    const result = await questionService.listQuestions(filters, {
      page: Number(page),
      limit: Number(limit),
      q,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
];

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
  createQuestion,
  listQuestions,
  getQuestionsByTopic,
  getRandomQuestions,
  getPendingQuestions,
  approveQuestion,
  rejectQuestion,
  getQuestionStats,
};
