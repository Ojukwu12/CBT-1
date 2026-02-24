const Joi = require('joi');

const feedbackSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  reason: Joi.string().valid('complaint', 'suggestion', 'bug', 'question', 'other').required(),
  description: Joi.string().min(5).max(2000).required(),
});

module.exports = {
  feedbackSchema,
};
