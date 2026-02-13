const SourceMaterial = require('../models/SourceMaterial');
const materialService = require('../services/materialService');
const courseService = require('../services/courseService');
const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { uploadMaterialSchema, generateQuestionsSchema, importQuestionsSchema } = require('../validators/material.validator');
const storageService = require('../services/storageService');
const mime = require('mime-types');
const ApiError = require('../utils/ApiError');

const uploadSourceMaterial = [
  validate(uploadMaterialSchema),
  asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { title, description, fileType, fileUrl, fileSize, content, topicId, extractionMethod = 'ocr' } = req.body;

    const user = await userService.getUserById(req.user.id);

    // Get course to derive universityId and departmentId
    const course = await courseService.getCourseById(courseId);
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

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
      throw new ApiError(400, 'Source material must include a file upload, fileUrl, or content');
    }

    const sourceMaterial = new SourceMaterial({
      universityId: course.universityId,
      departmentId: course.departmentId,
      courseId,
      topicId,
      title,
      description,
      fileType,
      fileUrl: finalFileUrl,
      fileSize: finalFileSize,
      content,
      uploadedBy: req.user.id,
      extractionMethod,
      processingStatus: 'uploaded',
      isActive: true,
    });

    await sourceMaterial.save();

    res.status(201).json({
      success: true,
      data: sourceMaterial,
      message: 'Source material uploaded successfully. Question extraction will begin shortly.',
    });
  })
];

const getSourceMaterial = asyncHandler(async (req, res) => {
  const { materialId } = req.params;
  
  const material = await SourceMaterial.findById(materialId);
  if (!material) {
    throw new ApiError(404, 'Source material not found');
  }

  res.status(200).json({
    success: true,
    data: material,
  });
});

const listSourceMaterialsByCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { status = 'completed', page = 1, limit = 20 } = req.query;

  await courseService.getCourseById(courseId);

  const filters = {
    courseId,
    isActive: true,
  };

  if (status) {
    filters.processingStatus = status;
  }

  const skip = (page - 1) * limit;
  const [materials, total] = await Promise.all([
    SourceMaterial.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    SourceMaterial.countDocuments(filters),
  ]);

  res.status(200).json({
    success: true,
    data: materials,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit) || 1,
    }
  });
});

// Keep old function name for backward compatibility
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
  uploadSourceMaterial,
  uploadMaterial: uploadSourceMaterial, // backward compatibility
  getSourceMaterial,
  getMaterial: getSourceMaterial, // backward compatibility
  listSourceMaterialsByCourse,
  listMaterialsByCourse,
  generateQuestionsFromMaterial,
  importQuestionsFromMaterial,
};
