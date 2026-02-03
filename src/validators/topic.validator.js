const Joi = require('joi');

const createTopicSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().allow('').optional(),
  universityId: Joi.string().required(),
});

const updateTopicSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().allow(''),
  isActive: Joi.boolean(),
});

module.exports = {
  createTopicSchema,
  updateTopicSchema,
};
