const Joi = require('joi');

const uploadMaterialSchema = Joi.object({
  title: Joi.string().min(2).max(100).required(),
  fileType: Joi.string().valid('pdf','image','text').required(),
  fileUrl: Joi.string().uri().optional(),
  fileSize: Joi.number().min(1).max(20000000).optional(),
  content: Joi.string().allow('').optional(),
  topicId: Joi.string().optional(),
});

const generateQuestionsSchema = Joi.object({
  difficulty: Joi.string().valid('easy','medium','hard','mixed').optional(),
});

const importQuestionsSchema = Joi.object({
  questions: Joi.array().items(
    Joi.object({
      text: Joi.string().min(5).max(1000).required(),
      options: Joi.object({
        A: Joi.string().required(),
        B: Joi.string().required(),
        C: Joi.string().required(),
        D: Joi.string().required(),
      }).required(),
      correctAnswer: Joi.string().valid('A','B','C','D').required(),
      difficulty: Joi.string().valid('easy','medium','hard').optional(),
    })
  ).min(1).required(),
});

module.exports = {
  uploadMaterialSchema,
  generateQuestionsSchema,
  importQuestionsSchema,
};
