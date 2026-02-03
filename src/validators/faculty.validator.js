const Joi = require('joi');

const createFacultySchema = Joi.object({
  code: Joi.string().alphanum().min(2).max(20).required(),
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().allow('').optional(),
});

const updateFacultySchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().allow(''),
  isActive: Joi.boolean(),
});

module.exports = {
  createFacultySchema,
  updateFacultySchema,
};
