const Joi = require('joi');

const uploadStudyMaterialSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().max(1000).optional(),
  fileType: Joi.string().valid('pdf', 'image', 'text', 'video', 'document').required(),
  fileUrl: Joi.string().uri().optional(),
  fileSize: Joi.number().optional(),
  topicId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  accessLevel: Joi.string().valid('free', 'basic', 'premium').default('free'),
});

const listStudyMaterialsSchema = Joi.object({
  topicId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  accessLevel: Joi.string().valid('free', 'basic', 'premium'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'downloadCount', 'views', '-createdAt', '-downloadCount', '-views').default('createdAt'),
});

const rateStudyMaterialSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
});

module.exports = {
  uploadStudyMaterialSchema,
  listStudyMaterialsSchema,
  rateStudyMaterialSchema,
};
