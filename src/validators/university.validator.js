const Joi = require('joi');

const createUniversitySchema = Joi.object({
  code: Joi.string().alphanum().min(2).max(20).required(),
  name: Joi.string().min(2).max(100).required(),
  abbreviation: Joi.string().min(2).max(10).required(),
  country: Joi.string().default('Nigeria'),
  state: Joi.string().optional(),
});

const updateUniversitySchema = Joi.object({
  name: Joi.string().min(2).max(100),
  abbreviation: Joi.string().min(2).max(10),
  country: Joi.string(),
  state: Joi.string(),
  isActive: Joi.boolean(),
});

module.exports = {
  createUniversitySchema,
  updateUniversitySchema,
};
