const Joi = require('joi');

const createPlanSchema = Joi.object({
  courseId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  name: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().max(500).optional(),
  topicIds: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).required().min(1),
  endDate: Joi.date().optional(),
  durationDays: Joi.number().integer().min(1).max(365).required(),
  dailyGoal: Joi.number().integer().min(1).max(50).default(5)
});

const updatePlanSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).optional(),
  description: Joi.string().trim().max(500).optional(),
  status: Joi.string().valid('active', 'paused', 'completed', 'archived').optional(),
  endDate: Joi.date().optional(),
  dailyGoal: Joi.number().integer().min(1).max(50).optional()
});

const planParamsSchema = Joi.object({
  planId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  topicId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional()
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

module.exports = {
  createPlanSchema,
  updatePlanSchema,
  planParamsSchema,
  paginationSchema
};
