const Joi = require('joi');

// Search Questions Validation
const searchQuestionsSchema = Joi.object({
  q: Joi.string().trim().min(1).max(200).required(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard'),
  topicId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  courseId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Advanced Filter Validation
const advancedFilterSchema = Joi.object({
  difficulty: Joi.alternatives().try(
    Joi.string().valid('easy', 'medium', 'hard'),
    Joi.array().items(Joi.string().valid('easy', 'medium', 'hard'))
  ),
  topicId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  courseId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  minAccuracy: Joi.number().integer().min(0).max(100),
  maxAttempts: Joi.number().integer().min(0).max(10000),
  question: Joi.string().trim().min(1).max(200),
  sort: Joi.string().max(500),
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Search Topics Validation
const searchTopicsSchema = Joi.object({
  q: Joi.string().trim().min(1).max(200).required(),
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Global Search Validation
const globalSearchSchema = Joi.object({
  q: Joi.string().trim().min(1).max(200).required(),
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

module.exports = {
  searchQuestionsSchema,
  advancedFilterSchema,
  searchTopicsSchema,
  globalSearchSchema
};
