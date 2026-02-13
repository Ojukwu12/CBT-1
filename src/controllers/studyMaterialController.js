const StudyMaterial = require('../models/StudyMaterial');
const courseService = require('../services/courseService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { uploadStudyMaterialSchema, listStudyMaterialsSchema } = require('../validators/studyMaterial.validator');
const storageService = require('../services/storageService');
const mime = require('mime-types');
const ApiError = require('../utils/ApiError');
const UserAnalytics = require('../models/UserAnalytics');

const uploadStudyMaterial = [
  validate(uploadStudyMaterialSchema),
  asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { title, description, fileType, fileUrl, fileSize, topicId, accessLevel = 'free' } = req.body;

    // Get course to derive universityId and departmentId
    const course = await courseService.getCourseById(courseId);
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    let finalFileUrl = fileUrl;
    let finalFileSize = fileSize;

    if (req.file) {
      const uploadResult = await storageService.uploadBuffer({
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
      });
      finalFileUrl = uploadResult.fileUrl;
      finalFileSize = uploadResult.fileSize;
    }

    if (!req.file && !finalFileUrl) {
      throw new ApiError(400, 'Study material must include a file upload or fileUrl');
    }

    const studyMaterial = new StudyMaterial({
      universityId: course.universityId,
      departmentId: course.departmentId,
      courseId,
      topicId,
      title,
      description,
      fileType,
      fileUrl: finalFileUrl,
      fileSize: finalFileSize,
      accessLevel,
      uploaderType: req.user.role === 'admin' ? 'admin' : 'faculty',
      uploadedBy: req.user.id,
      isActive: true,
    });

    await studyMaterial.save();

    res.status(201).json({
      success: true,
      data: studyMaterial,
      message: 'Study material uploaded successfully',
    });
  })
];

const listStudyMaterials = [
  validate(listStudyMaterialsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { topicId, accessLevel, page = 1, limit = 20, sortBy = 'createdAt' } = req.query;

    // Verify course exists
    await courseService.getCourseById(courseId);

    const filters = {
      courseId,
      isActive: true,
    };

    if (topicId) {
      filters.topicId = topicId;
    }

    if (accessLevel) {
      filters.accessLevel = accessLevel;
    }

    const skip = (page - 1) * limit;
    const [materials, total] = await Promise.all([
      StudyMaterial.find(filters)
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      StudyMaterial.countDocuments(filters),
    ]);

    res.status(200).json({
      success: true,
      data: materials,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit) || 1,
      },
    });
  })
];

const getStudyMaterial = asyncHandler(async (req, res) => {
  const { materialId } = req.params;

  const material = await StudyMaterial.findById(materialId);
  if (!material) {
    throw new ApiError(404, 'Study material not found');
  }

  // Increment views
  await StudyMaterial.findByIdAndUpdate(materialId, { $inc: { views: 1 } });

  res.status(200).json({
    success: true,
    data: material,
  });
});

const downloadStudyMaterial = asyncHandler(async (req, res) => {
  const { materialId } = req.params;

  const material = await StudyMaterial.findById(materialId);
  if (!material) {
    throw new ApiError(404, 'Study material not found');
  }

  if (!material.isActive) {
    throw new ApiError(403, 'This study material is no longer available');
  }

  // Check access level
  const user = req.user;
  if (material.accessLevel !== 'free') {
    // Admins have full access (same as premium)
    if (user.role !== 'admin') {
      if (!user || user.plan !== 'premium' && material.accessLevel === 'premium') {
        if (user.plan === 'free' && material.accessLevel !== 'free') {
          throw new ApiError(403, 'Premium access required to download this material');
        }
      }
    }
  }

  // Increment download count
  await StudyMaterial.findByIdAndUpdate(materialId, { $inc: { downloadCount: 1 } });

  // Track download in UserAnalytics
  if (user) {
    const analytics = await UserAnalytics.findOne({ userId: user.id });
    if (analytics) {
      analytics.materialsDownloaded = (analytics.materialsDownloaded || 0) + 1;
      
      if (!analytics.downloadedMaterials) {
        analytics.downloadedMaterials = [];
      }
      
      analytics.downloadedMaterials.push({
        materialId,
        materialTitle: material.title,
        courseId: material.courseId,
        downloadedAt: new Date(),
        fileSize: material.fileSize,
      });
      
      await analytics.save();
    }
  }

  res.status(200).json({
    success: true,
    data: {
      materialId: material._id,
      title: material.title,
      downloadUrl: material.fileUrl,
      fileType: material.fileType,
      fileSize: material.fileSize,
    },
    message: 'Download link ready',
  });
});

const rateStudyMaterial = asyncHandler(async (req, res) => {
  const { materialId } = req.params;
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5');
  }

  const material = await StudyMaterial.findByIdAndUpdate(
    materialId,
    {
      $inc: {
        'rating.count': 1,
        'rating.average': rating,
      },
    },
    { new: true }
  );

  if (!material) {
    throw new ApiError(404, 'Study material not found');
  }

  // Recalculate average
  material.rating.average = material.rating.average / material.rating.count;
  await material.save();

  res.status(200).json({
    success: true,
    data: material,
    message: 'Material rated successfully',
  });
});

module.exports = {
  uploadStudyMaterial,
  listStudyMaterials,
  getStudyMaterial,
  downloadStudyMaterial,
  rateStudyMaterial,
};
