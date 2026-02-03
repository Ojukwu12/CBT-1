const materialService = require('../services/materialService');
const courseService = require('../services/courseService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { uploadMaterialSchema, generateQuestionsSchema } = require('../validators/material.validator');

const uploadMaterial = [
  validate(uploadMaterialSchema),
  asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { title, fileType, fileUrl, fileSize, content, uploadedBy, universityId } = req.body;

    await courseService.getCourseById(courseId);

    const material = await materialService.uploadMaterial({
      courseId,
      universityId,
      title,
      fileType,
      fileUrl,
      fileSize,
      content,
      uploadedBy,
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
    const { adminId, difficulty = 'mixed' } = req.body;

    const result = await materialService.generateQuestionsFromMaterial(
      materialId,
      adminId,
      difficulty
    );

    res.status(200).json({
      success: true,
      data: {
        log: result.log,
        questionsCount: result.questions.length,
        questionIds: result.questions.map((q) => q._id),
      },
      message: `${result.questions.length} questions generated and pending approval`,
    });
  })
];

module.exports = {
  uploadMaterial,
  getMaterial,
  listMaterialsByCourse,
  generateQuestionsFromMaterial,
};
