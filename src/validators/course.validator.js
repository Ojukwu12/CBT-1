const Joi = require('joi');

const createCourseSchema = Joi.object({
  code: Joi.string().alphanum().min(2).max(20).required(),
  title: Joi.string().min(2).max(100).required(),
  creditUnits: Joi.number().integer().min(1).max(10).required(),
  level: Joi.number().valid(100,200,300,400,500,600).required(),
  description: Joi.string().allow('').optional(),
});

const updateCourseSchema = Joi.object({
  title: Joi.string().min(2).max(100),
  creditUnits: Joi.number().integer().min(1).max(10),
  level: Joi.number().valid(100,200,300,400,500,600),
  description: Joi.string().allow(''),
  isActive: Joi.boolean(),
});

module.exports = {
  createCourseSchema,
  updateCourseSchema,
};
