const Joi = require('joi');

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  universityId: Joi.string().required(),
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
  upgradePlanSchema,
  downgradePlanSchema,
};
