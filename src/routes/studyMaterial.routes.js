const express = require('express');
const studyMaterialController = require('../controllers/studyMaterialController');
const { verifyToken } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const ApiError = require('../utils/ApiError');

const router = express.Router({ mergeParams: true });

const isAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'faculty')) {
    return next(new ApiError(403, 'Admin or Faculty access required'));
  }
  next();
};

router.use(verifyToken);

// Upload study material (admin/faculty only)
router.post('/:courseId/upload', isAdmin, upload.single('file'), studyMaterialController.uploadStudyMaterial);

// List study materials for a course
router.get('/:courseId', studyMaterialController.listStudyMaterials);

// Get specific study material
router.get('/:courseId/:materialId', studyMaterialController.getStudyMaterial);

// Download study material (logs download)
router.post('/:courseId/:materialId/download', studyMaterialController.downloadStudyMaterial);

// Rate study material
router.post('/:courseId/:materialId/rate', studyMaterialController.rateStudyMaterial);

module.exports = router;
