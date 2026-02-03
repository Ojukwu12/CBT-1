const Joi = require('joi');

const analyticsParamsSchema = Joi.object({
  topicId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid topic ID format'
    }),
  courseId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid course ID format'
    })
});

const trendsQuerySchema = Joi.object({
  days: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30)
    .messages({
      'number.min': 'Days must be at least 1',
      'number.max': 'Cannot query more than 365 days'
    })
});

const monthlyStatsSchema = Joi.object({
  month: Joi.string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Month must be in YYYY-MM format'
    })
});

module.exports = {
  analyticsParamsSchema,
  trendsQuerySchema,
  monthlyStatsSchema
};
