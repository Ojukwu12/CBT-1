const Joi = require('joi');

const uploadMaterialSchema = Joi.object({
  title: Joi.string().min(2).max(100).required(),
  fileType: Joi.string().valid('pdf','image','text').required(),
  fileUrl: Joi.string().uri().required(),
  fileSize: Joi.number().min(1).max(20000000).required(),
  content: Joi.string().allow('').optional(),
  universityId: Joi.string().required(),
  uploadedBy: Joi.string().required(),
  courseId: Joi.string().required(),
  topicId: Joi.string().optional(),
});

const generateQuestionsSchema = Joi.object({
  adminId: Joi.string().required(),
  difficulty: Joi.string().valid('easy','medium','hard','mixed').optional(),
});

module.exports = {
  uploadMaterialSchema,
  generateQuestionsSchema,
};
