const materialService = require('../services/materialService');
const courseService = require('../services/courseService');
const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { uploadMaterialSchema, generateQuestionsSchema, importQuestionsSchema } = require('../validators/material.validator');
const storageService = require('../services/storageService');
const mime = require('mime-types');
const ApiError = require('../utils/ApiError');

const uploadMaterial = [
  validate(uploadMaterialSchema),
  asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { title, fileType, fileUrl, fileSize, content, topicId } = req.body;

    const user = await userService.getUserById(req.user.id);

    await courseService.getCourseById(courseId);

    let finalFileUrl = fileUrl;
    let finalFileSize = fileSize;
    let fileBuffer = null;

    if (req.file) {
      fileBuffer = req.file.buffer;
      const uploadResult = await storageService.uploadBuffer({
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
      });
      finalFileUrl = uploadResult.fileUrl;
      finalFileSize = uploadResult.fileSize;
    }

    if (!req.file && !finalFileUrl && !content) {
      throw new ApiError(400, 'Material must include a file upload, fileUrl, or content');
    }

    const material = await materialService.uploadMaterial({
      courseId,
      universityId: user.universityId,
      title,
      fileType,
      fileUrl: finalFileUrl,
      fileSize: finalFileSize,
      content,
      topicId,
      uploadedBy: req.user.id,
      fileBuffer,
      mimeType: req.file?.mimetype || mime.lookup(finalFileUrl || '') || undefined,
    });

    res.status(201).json({
      success: true,
      data: material,
      message: 'Material uploaded successfully',
    });
  })
];

const getMaterial = asyncHandler(async (req, res) => {
  const material = await materialService.getMaterialById(req.params.id);
  res.status(200).json({
    success: true,
    data: material,
  });
});

const listMaterialsByCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  await courseService.getCourseById(courseId);

  const materials = await materialService.getMaterialsByCourse(courseId, {
    isActive: true,
  });
  res.status(200).json({
    success: true,
    data: materials,
    count: materials.length,
  });
});

const generateQuestionsFromMaterial = [
  validate(generateQuestionsSchema),
  asyncHandler(async (req, res) => {
    const { materialId } = req.params;
    const { difficulty = 'mixed' } = req.body;

    const result = await materialService.generateQuestionsFromMaterial(
      materialId,
      req.user.id,
      difficulty
    );

    if (result.missingAnswers) {
      return res.status(400).json({
        success: false,
        data: {
          materialId,
          missingAnswers: result.missingAnswers,
          extractedQuestions: result.extractedQuestions,
        },
        message: 'Some extracted questions are missing answers. Please provide answers and re-import.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        log: result.log || null,
        mode: result.mode,
        questionsCount: result.questions.length,
        questionIds: result.questions.map((q) => q._id),
      },
      message: `${result.questions.length} questions generated and pending approval`,
    });
  })
];

const importQuestionsFromMaterial = [
  validate(importQuestionsSchema),
  asyncHandler(async (req, res) => {
    const { materialId } = req.params;
    const { questions } = req.body;

    const result = await materialService.importQuestionsFromMaterial(
      materialId,
      req.user.id,
      questions
    );

    res.status(201).json({
      success: true,
      data: {
        questionsCount: result.questions.length,
        questionIds: result.questions.map((q) => q._id),
      },
      message: `${result.questions.length} questions imported and pending approval`,
    });
  })
];

module.exports = {
  uploadMaterial,
  getMaterial,
  listMaterialsByCourse,
  generateQuestionsFromMaterial,
  importQuestionsFromMaterial,
};
