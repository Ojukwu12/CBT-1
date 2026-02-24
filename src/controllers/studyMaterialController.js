const StudyMaterial = require('../models/StudyMaterial');
const courseService = require('../services/courseService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { uploadStudyMaterialSchema, listStudyMaterialsSchema } = require('../validators/studyMaterial.validator');
const storageService = require('../services/storageService');
const { inferFileTypeFromUpload } = require('../utils/fileType');
const ApiError = require('../utils/ApiError');
const UserAnalytics = require('../models/UserAnalytics');
const User = require('../models/User');
const path = require('path');
const mime = require('mime-types');
const { downloadFile } = require('../utils/fileExtraction');

const getDownloadLimitByPlan = (user) => {
  if (!user || user.role === 'admin') {
    return null;
  }

  if (user.plan === 'free') {
    return 7;
  }

  return null;
};

const getTodayBounds = () => {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
};

const getFileExtensionFromMaterial = (material) => {
  const fromUrl = (() => {
    try {
      if (!material?.fileUrl) return '';
      if (/^https?:\/\//i.test(material.fileUrl)) {
        const url = new URL(material.fileUrl);
        return path.extname(url.pathname || '');
      }
      return path.extname(material.fileUrl);
    } catch (_) {
      return '';
    }
  })();

  if (fromUrl) {
    return fromUrl;
  }

  const byType = {
    pdf: '.pdf',
    image: '.jpg',
    text: '.txt',
    video: '.mp4',
    document: '.docx',
    docx: '.docx',
  };

  return byType[material?.fileType] || '';
};

const buildDownloadFilename = (material) => {
  const ext = getFileExtensionFromMaterial(material);
  const baseTitle = String(material?.title || 'study-material')
    .trim()
    .replace(/[^a-zA-Z0-9-_\s]/g, '')
    .replace(/\s+/g, '-') || 'study-material';

  return `${baseTitle}${ext}`;
};

const getDownloadLimitStatusForUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.plan !== 'free' && user.planExpiresAt && new Date() > user.planExpiresAt) {
    user.plan = 'free';
    user.planExpiresAt = null;
    await user.save();
  }

  const dailyLimit = getDownloadLimitByPlan(user);
  const { dayStart, dayEnd } = getTodayBounds();
  const analytics = await UserAnalytics.findOne({ userId: user._id });

  const usedToday = (analytics?.downloadedMaterials || []).reduce((count, item) => {
    if (!item?.downloadedAt) {
      return count;
    }

    const downloadedAt = new Date(item.downloadedAt);
    return downloadedAt >= dayStart && downloadedAt < dayEnd ? count + 1 : count;
  }, 0);

  return {
    userTier: user.role === 'admin' ? 'admin' : user.plan,
    dailyLimit,
    usedToday,
    remainingToday: dailyLimit === null ? null : Math.max(dailyLimit - usedToday, 0),
    resetsAt: dayEnd,
    scope: 'study_material_downloads',
  };
};

const inferUploadStudyMaterialFileType = (req, res, next) => {
  if (!req.body.fileType && req.file) {
    const inferredFileType = inferFileTypeFromUpload(req.file);
    if (inferredFileType) {
      req.body.fileType = inferredFileType;
    }
  }
  next();
};

const uploadStudyMaterial = [
  inferUploadStudyMaterialFileType,
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

  // Load current user to enforce active plan limits accurately
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.plan !== 'free' && user.planExpiresAt && new Date() > user.planExpiresAt) {
    user.plan = 'free';
    user.planExpiresAt = null;
    await user.save();
  }

  // Check access level
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

  const limitStatus = await getDownloadLimitStatusForUser(req.user.id);
  if (limitStatus.dailyLimit !== null && limitStatus.remainingToday <= 0) {
    throw new ApiError(429, `Daily download limit reached for free tier (${limitStatus.dailyLimit}/day). Upgrade your plan for unlimited downloads.`, {
      dailyLimit: limitStatus.dailyLimit,
      usedToday: limitStatus.usedToday,
      remainingToday: 0,
      resetsAt: limitStatus.resetsAt,
      scope: 'study_material_downloads'
    });
  }

  let analytics = await UserAnalytics.findOne({ userId: user._id });

  // Increment download count
  await StudyMaterial.findByIdAndUpdate(materialId, { $inc: { downloadCount: 1 } });

  // Track download in UserAnalytics
  if (user) {
    if (!analytics) {
      analytics = new UserAnalytics({ userId: user._id });
    }

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

  let fileBuffer;
  try {
    fileBuffer = await downloadFile(material.fileUrl);
  } catch (error) {
    throw new ApiError(502, 'Unable to fetch study material file for download');
  }

  const filename = buildDownloadFilename(material);
  const contentType = mime.lookup(filename) || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', fileBuffer.length);
  return res.status(200).send(fileBuffer);
});

const getDownloadLimitStatus = asyncHandler(async (req, res) => {
  const status = await getDownloadLimitStatusForUser(req.user.id);

  res.status(200).json({
    success: true,
    data: status,
    message: 'Study material download limit status retrieved',
  });
});

const updateStudyMaterial = asyncHandler(async (req, res) => {
  const { materialId } = req.params;
  const updates = req.body;

  const material = await StudyMaterial.findById(materialId);
  if (!material) {
    throw new ApiError(404, 'Study material not found');
  }

  if (!material.isActive) {
    throw new ApiError(400, 'Cannot update an inactive study material');
  }

  const allowedUpdates = ['title', 'description', 'topicId', 'accessLevel', 'fileType', 'fileUrl', 'fileSize'];
  allowedUpdates.forEach((field) => {
    if (updates[field] !== undefined) {
      material[field] = updates[field];
    }
  });

  await material.save();

  res.status(200).json({
    success: true,
    data: material,
    message: 'Study material updated successfully',
  });
});

const deleteStudyMaterial = asyncHandler(async (req, res) => {
  const { materialId } = req.params;

  const material = await StudyMaterial.findById(materialId);
  if (!material) {
    throw new ApiError(404, 'Study material not found');
  }

  if (!material.isActive) {
    return res.status(200).json({
      success: true,
      message: 'Study material already deleted',
    });
  }

  material.isActive = false;
  await material.save();

  res.status(200).json({
    success: true,
    message: 'Study material deleted successfully',
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

/**
 * Get study materials by hierarchical selection (university → department → course)
 * GET /api/study-materials/hierarchy?universityId=&departmentId=&courseId=
 * Allows users to drill down through the hierarchy to find materials
 */
const getStudyMaterialsByHierarchy = asyncHandler(async (req, res) => {
  const { universityId, departmentId, courseId, topicId, page = 1, limit = 20, sortBy = 'createdAt' } = req.query;

  if (!courseId) {
    throw new ApiError(400, 'courseId is required');
  }

  // Verify course exists and belongs to the specified department and university
  const Course = require('../models/Course');
  const course = await Course.findById(courseId)
    .populate('departmentId', 'universityId')
    .lean();

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  // Validate hierarchy if provided
  if (departmentId && course.departmentId._id.toString() !== departmentId) {
    throw new ApiError(400, 'Course does not belong to the specified department');
  }

  if (universityId && course.departmentId.universityId.toString() !== universityId) {
    throw new ApiError(400, 'Course does not belong to the specified university');
  }

  const filters = {
    courseId,
    isActive: true,
  };

  if (topicId) {
    filters.topicId = topicId;
  }

  const skip = (page - 1) * limit;
  const [materials, total] = await Promise.all([
    StudyMaterial.find(filters)
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    StudyMaterial.countDocuments(filters),
  ]);

  res.status(200).json({
    success: true,
    data: materials,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
    message: 'Study materials retrieved successfully',
  });
});

module.exports = {
  uploadStudyMaterial,
  listStudyMaterials,
  getStudyMaterial,
  downloadStudyMaterial,
  getDownloadLimitStatus,
  updateStudyMaterial,
  deleteStudyMaterial,
  rateStudyMaterial,
  getStudyMaterialsByHierarchy,
};
