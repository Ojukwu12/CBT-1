const Joi = require('joi');

const initializePaymentSchema = Joi.object({
  plan: Joi.string()
    .valid('basic', 'premium')
    .required()
    .messages({
      'any.only': 'Plan must be one of: basic, premium',
      'any.required': 'Plan is required',
    }),
  promoCode: Joi.string()
    .min(3)
    .max(20)
    .uppercase()
    .optional()
    .messages({
      'string.min': 'Promo code must be at least 3 characters',
      'string.max': 'Promo code must not exceed 20 characters',
    }),
});

const verifyPaymentSchema = Joi.object({
  reference: Joi.string()
    .required()
    .trim()
    .messages({
      'any.required': 'Payment reference is required',
    }),
});

const getTransactionHistorySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
  status: Joi.string()
    .valid('pending', 'success', 'failed', 'cancelled')
    .messages({
      'any.only': 'Status must be one of: pending, success, failed, cancelled',
    }),
});

const checkPaymentStatusSchema = Joi.object({
  reference: Joi.string()
    .required()
    .trim()
    .messages({
      'any.required': 'Payment reference is required',
    }),
});

module.exports = {
  initializePaymentSchema,
  verifyPaymentSchema,
  getTransactionHistorySchema,
  checkPaymentStatusSchema,
};
