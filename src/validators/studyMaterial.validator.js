const Joi = require('joi');

const uploadStudyMaterialSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().max(1000).optional(),
  fileType: Joi.string().valid('pdf', 'image', 'text', 'video', 'document', 'docx').required(),
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

const updateStudyMaterialSchema = Joi.object({
  title: Joi.string().min(5).max(200).optional(),
  description: Joi.string().max(1000).allow('').optional(),
  topicId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).optional(),
  accessLevel: Joi.string().valid('free', 'basic', 'premium').optional(),
  fileType: Joi.string().valid('pdf', 'image', 'text', 'video', 'document', 'docx').optional(),
  fileUrl: Joi.string().uri().optional(),
  fileSize: Joi.number().optional(),
}).min(1);

const studyMaterialParamsSchema = Joi.object({
  courseId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  materialId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
});

const rateStudyMaterialSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
});

module.exports = {
  uploadStudyMaterialSchema,
  listStudyMaterialsSchema,
  updateStudyMaterialSchema,
  studyMaterialParamsSchema,
  rateStudyMaterialSchema,
};
