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

module.exports = {
  createQuestionSchema,
  approveRejectSchema,
};
