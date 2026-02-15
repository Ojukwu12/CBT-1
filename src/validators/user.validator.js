const Joi = require('joi');

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),

  password: Joi.string().min(6).max(128).required(),
});

const changePlanSchema = Joi.object({
  plan: Joi.string().valid('free','basic','premium').required(),
  expiryDays: Joi.number().integer().min(1).max(365).optional().default(30),
});

const upgradePlanSchema = Joi.object({
  newPlan: Joi.string().valid('basic','premium').required(),
  expiryDays: Joi.number().integer().min(1).max(365).optional(),
});

const downgradePlanSchema = Joi.object({
  newPlan: Joi.string().valid('free','basic').optional(),
});

module.exports = {
  createUserSchema,
  changePlanSchema,
  upgradePlanSchema,
  downgradePlanSchema,
};
