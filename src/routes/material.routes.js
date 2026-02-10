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

router.post('/', isAdmin, upload.single('file'), materialController.uploadMaterial);
router.get('/', materialController.listMaterialsByCourse);
router.get('/:id', materialController.getMaterial);
router.post(
	'/:materialId/generate-questions',
	isAdmin,
	aiLimiter,
	longOperationTimeout,
	materialController.generateQuestionsFromMaterial
);
router.post(
	'/:materialId/import-questions',
	isAdmin,
	materialController.importQuestionsFromMaterial
);

module.exports = router;
