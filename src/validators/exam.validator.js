const Joi = require('joi');

const examStartSchema = Joi.object({
  universityId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid university ID format',
      'any.required': 'University selection is required'
    }),
  departmentId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid department ID format',
      'any.required': 'Department selection is required'
    }),
  courseId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid course ID format',
      'any.required': 'Course selection is required'
    }),
  examType: Joi.string()
    .valid('practice', 'mock', 'final')
    .default('practice')
    .messages({
      'any.only': 'Exam type must be practice, mock, or final'
    }),
  topicIds: Joi.array()
    .items(
      Joi.string().regex(/^[0-9a-fA-F]{24}$/)
    )
    .default([])
    .messages({
      'array.includesRequiredUnknowns': 'Each topic ID must be valid'
    }),
  totalQuestions: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Minimum 1 question required',
      'number.max': 'Maximum 100 questions allowed'
    }),
  durationMinutes: Joi.number()
    .integer()
    .min(5)
    .max(300)
    .default(60)
    .messages({
      'number.min': 'Exam duration must be at least 5 minutes',
      'number.max': 'Exam duration cannot exceed 300 minutes'
    })
});

const submitAnswerSchema = Joi.object({
  questionId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid question ID format',
      'any.required': 'Question ID is required'
    }),
  selectedAnswer: Joi.string()
    .valid('A', 'B', 'C', 'D')
    .required()
    .messages({
      'any.only': 'Answer must be A, B, C, or D',
      'any.required': 'Selected answer is required'
    }),
  timeSpentSeconds: Joi.number()
    .integer()
    .min(0)
    .max(3600)
    .default(0)
    .messages({
      'number.max': 'Time cannot exceed 1 hour per question'
    })
});

const examParamsSchema = Joi.object({
  examSessionId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid exam session ID format'
    })
});

const historyQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
});

module.exports = {
  examStartSchema,
  submitAnswerSchema,
  examParamsSchema,
  historyQuerySchema
};
