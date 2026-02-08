const Joi = require('joi');

const createQuestionSchema = Joi.object({
  text: Joi.string().min(5).max(1000).required(),
  options: Joi.object({
    A: Joi.string().required(),
    B: Joi.string().required(),
    C: Joi.string().required(),
    D: Joi.string().required(),
  }).required(),
  correctAnswer: Joi.string().valid('A','B','C','D').required(),
  difficulty: Joi.string().valid('easy','medium','hard').required(),
  source: Joi.string().valid('AI','Human').required(),
  accessLevel: Joi.string().valid('free','basic','premium').required(),
  universityId: Joi.string().required(),
  courseId: Joi.string().required(),
  topicId: Joi.string().required(),
});

const approveRejectSchema = Joi.object({
  adminId: Joi.string().required(),
  notes: Joi.string().allow('').optional(),
});

const listQuestionsSchema = Joi.object({
  universityId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  courseId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  departmentId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  topicId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  createdBy: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  level: Joi.number().integer().valid(100, 200, 300, 400, 500, 600),
  difficulty: Joi.string().valid('easy', 'medium', 'hard'),
  status: Joi.string().valid('pending', 'approved', 'rejected'),
  accessLevel: Joi.string().valid('free', 'basic', 'premium'),
  source: Joi.string().valid('AI', 'Human'),
  q: Joi.string().trim().min(1).max(200),
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  createQuestionSchema,
  approveRejectSchema,
  listQuestionsSchema,
};
