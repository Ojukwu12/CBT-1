const express = require('express');
const studyMaterialController = require('../controllers/studyMaterialController');
const { verifyToken } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const validate = require('../middleware/validate.middleware');
const { updateStudyMaterialSchema, studyMaterialParamsSchema } = require('../validators/studyMaterial.validator');
const ApiError = require('../utils/ApiError');

const router = express.Router({ mergeParams: true });

const isAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'faculty')) {
    return next(new ApiError(403, 'Admin or Faculty access required'));
  }
  next();
};

router.use(verifyToken);

// List study materials by hierarchy (university → department → course)
router.get('/hierarchy/browse', studyMaterialController.getStudyMaterialsByHierarchy);

// Daily download limit status
router.get('/downloads/limit-status', studyMaterialController.getDownloadLimitStatus);

// Upload study material (admin/faculty only)
router.post('/:courseId/upload', isAdmin, upload.single('file'), studyMaterialController.uploadStudyMaterial);
// Preferred upload route (uses parent :courseId)
router.post('/upload', isAdmin, upload.single('file'), studyMaterialController.uploadStudyMaterial);

// List study materials for a course
router.get('/:courseId', studyMaterialController.listStudyMaterials);
// Preferred list route (uses parent :courseId)
router.get('/', studyMaterialController.listStudyMaterials);

// Get specific study material
router.get('/:courseId/:materialId', studyMaterialController.getStudyMaterial);
// Preferred get route (uses parent :courseId)
router.get('/:materialId', studyMaterialController.getStudyMaterial);

// Download study material (logs download)
router.post('/:courseId/:materialId/download', studyMaterialController.downloadStudyMaterial);
// Preferred download route (uses parent :courseId)
router.post('/:materialId/download', studyMaterialController.downloadStudyMaterial);

// Preview study material (temporary inline view URL)
router.post('/:courseId/:materialId/preview', studyMaterialController.previewStudyMaterial);
// Preferred preview route (uses parent :courseId)
router.post('/:materialId/preview', studyMaterialController.previewStudyMaterial);

// Update study material (admin/faculty only)
router.patch('/:courseId/:materialId', isAdmin, validate(studyMaterialParamsSchema, 'params'), validate(updateStudyMaterialSchema), studyMaterialController.updateStudyMaterial);
// Preferred update route (uses parent :courseId)
router.patch('/:materialId', isAdmin, validate(updateStudyMaterialSchema), studyMaterialController.updateStudyMaterial);

// Delete study material (admin/faculty only)
router.delete('/:courseId/:materialId', isAdmin, validate(studyMaterialParamsSchema, 'params'), studyMaterialController.deleteStudyMaterial);
// Preferred delete route (uses parent :courseId)
router.delete('/:materialId', isAdmin, studyMaterialController.deleteStudyMaterial);

// Rate study material
router.post('/:courseId/:materialId/rate', studyMaterialController.rateStudyMaterial);
// Preferred rate route (uses parent :courseId)
router.post('/:materialId/rate', studyMaterialController.rateStudyMaterial);

module.exports = router;
