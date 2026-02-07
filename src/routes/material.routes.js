const express = require('express');
const materialController = require('../controllers/materialController');
const { verifyToken } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimit.middleware');
const ApiError = require('../utils/ApiError');

const isAdmin = (req, res, next) => {
	if (!req.user || req.user.role !== 'admin') {
		return next(new ApiError(403, 'Admin access required'));
	}
	next();
};

const router = express.Router({ mergeParams: true });

router.post('/', materialController.uploadMaterial);
router.get('/', materialController.listMaterialsByCourse);
router.get('/:id', materialController.getMaterial);
router.post(
	'/:materialId/generate-questions',
	verifyToken,
	isAdmin,
	aiLimiter,
	materialController.generateQuestionsFromMaterial
);

module.exports = router;
