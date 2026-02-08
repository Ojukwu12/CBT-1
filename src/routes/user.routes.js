const express = require('express');
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth.middleware');
const ApiError = require('../utils/ApiError');

const router = express.Router();

const isAdmin = (req, res, next) => {
	if (!req.user || req.user.role !== 'admin') {
		return next(new ApiError(403, 'Admin access required'));
	}
	next();
};

const isSelfOrAdmin = (req, res, next) => {
	if (req.user?.role === 'admin') {
		return next();
	}
	if (req.user?.id === req.params.id) {
		return next();
	}
	return next(new ApiError(403, 'Access denied'));
};

router.use(verifyToken);

router.post('/', isAdmin, userController.createUser);
router.get('/email/:email', isAdmin, userController.getUserByEmail);
router.get('/university/:universityId', isAdmin, userController.listUsersByUniversity);
router.get('/:id', isSelfOrAdmin, userController.getUser);
router.post('/:userId/upgrade-plan', isAdmin, userController.upgradePlan);
router.post('/:userId/downgrade-plan', isAdmin, userController.downgradePlan);

module.exports = router;
