const express = require('express');
const materialController = require('../controllers/materialController');
const { verifyToken } = require('../middleware/auth.middleware');
const { longOperationTimeout } = require('../middleware/timeout.middleware');
const { aiLimiter } = require('../middleware/rateLimit.middleware');
const { upload } = require('../middleware/upload.middleware');
const ApiError = require('../utils/ApiError');

const isAdmin = (req, res, next) => {
	if (!req.user || req.user.role !== 'admin') {
		return next(new ApiError(403, 'Admin access required'));
	}
	next();
};

const router = express.Router({ mergeParams: true });

router.use(verifyToken);

// Upload source material for question extraction
router.post('/', isAdmin, upload.single('file'), materialController.uploadSourceMaterial);
// List source materials (for question extraction status)
router.get('/', materialController.listSourceMaterialsByCourse);
// Get specific source material
router.get('/:id', materialController.getSourceMaterial);
// Generate questions from source material (OCR/AI extraction)
router.post(
	'/:materialId/generate-questions',
	isAdmin,
	aiLimiter,
	longOperationTimeout,
	materialController.generateQuestionsFromMaterial
);
// Import manually created questions from material
router.post(
	'/:materialId/import-questions',
	isAdmin,
	materialController.importQuestionsFromMaterial
);

module.exports = router;
