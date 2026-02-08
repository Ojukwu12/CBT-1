const Question = require('../models/Question');
const ApiError = require('../utils/ApiError');

const createQuestion = async (questionData) => {
  const question = new Question(questionData);
  return await question.save();
};

const createManyQuestions = async (questionsData) => {
  return await Question.insertMany(questionsData, { ordered: false });
};

const listQuestions = async (filters = {}, options = {}) => {
  const { page = 1, limit = 20, q } = options;
  const query = { ...filters };

  if (q) {
    query.$text = { $search: q };
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Question.find(query)
      .select('-correctAnswer -__v')
      .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Question.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

const getQuestionById = async (id) => {
  const question = await Question.findById(id)
    .populate('universityId')
    .populate('courseId')
    .populate('topicId');

  if (!question) {
    throw new ApiError(404, 'Question not found');
  }

  return question;
};

const getQuestionsByTopic = async (topicId, filters = {}) => {
  const query = { topicId, ...filters };
  return await Question.find(query).select('-correctAnswer -__v').limit(100);
};

const getRandomQuestions = async (
  topicId,
  count = 10,
  accessLevel = 'free',
  userPlan = 'free'
) => {
  const statusFilter = { status: 'approved', isActive: true };

  const accessLevels = userPlan === 'premium' 
    ? ['free', 'basic', 'premium'] 
    : userPlan === 'basic' 
    ? ['free', 'basic'] 
    : ['free'];

  const query = {
    topicId,
    accessLevel: { $in: accessLevels },
    ...statusFilter,
  };

  const questions = await Question.aggregate([
    { $match: query },
    { $sample: { size: Math.min(count, 100) } },
    {
      $project: {
        correctAnswer: 0,
        __v: 0,
      },
    },
  ]);

  return questions;
};

const getQuestionsByTopicAndDifficulty = async (
  topicId,
  difficulty,
  accessLevel = 'free'
) => {
  const query = {
    topicId,
    difficulty,
    accessLevel,
    status: 'approved',
    isActive: true,
  };

  return await Question.find(query)
    .select('-correctAnswer -__v')
    .limit(50);
};

const approveQuestion = async (questionId, adminId, notes = '') => {
  const question = await Question.findByIdAndUpdate(
    questionId,
    {
      status: 'approved',
      approvedBy: adminId,
      approvalNotes: notes,
    },
    { new: true }
  );

  if (!question) {
    throw new ApiError(404, 'Question not found');
  }

  return question;
};

const rejectQuestion = async (questionId, adminId, notes = '') => {
  const question = await Question.findByIdAndUpdate(
    questionId,
    {
      status: 'rejected',
      approvedBy: adminId,
      approvalNotes: notes,
    },
    { new: true }
  );

  if (!question) {
    throw new ApiError(404, 'Question not found');
  }

  return question;
};

const getPendingQuestions = async (universityId, filters = {}) => {
  const query = { universityId, status: 'pending', ...filters };
  return await Question.find(query)
    .populate('topicId')
    .populate('courseId')
    .select('-__v')
    .limit(100);
};

const getQuestionStats = async (topicId) => {
  const stats = await Question.aggregate([
    { $match: { topicId, status: 'approved' } },
    {
      $group: {
        _id: '$difficulty',
        count: { $sum: 1 },
        avgAccuracy: { $avg: '$stats.accuracy' },
      },
    },
  ]);

  return stats;
};

module.exports = {
  createQuestion,
  createManyQuestions,
  listQuestions,
  getQuestionById,
  getQuestionsByTopic,
  getRandomQuestions,
  getQuestionsByTopicAndDifficulty,
  approveQuestion,
  rejectQuestion,
  getPendingQuestions,
  getQuestionStats,
};
