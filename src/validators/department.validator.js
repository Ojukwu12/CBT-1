const Joi = require('joi');

const createDepartmentSchema = Joi.object({
  code: Joi.string().alphanum().min(2).max(20).required(),
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().allow('').optional(),
  universityId: Joi.string().required(),
});

const updateDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().allow(''),
  isActive: Joi.boolean(),
});

module.exports = {
  createDepartmentSchema,
  updateDepartmentSchema,
};
