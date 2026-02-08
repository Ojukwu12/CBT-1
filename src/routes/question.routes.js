const express = require('express');
const questionController = require('../controllers/questionController');
const { verifyToken } = require('../middleware/auth.middleware');
const ApiError = require('../utils/ApiError');

const router = express.Router({ mergeParams: true });

const isAdmin = (req, res, next) => {
	if (!req.user || req.user.role !== 'admin') {
		return next(new ApiError(403, 'Admin access required'));
	}
	next();
};

router.get('/', questionController.listQuestions);
router.post('/', verifyToken, isAdmin, questionController.createQuestion);
router.get('/pending/:universityId', questionController.getPendingQuestions);
router.get('/stats/:topicId', questionController.getQuestionStats);
router.get('/random/:topicId', questionController.getRandomQuestions);
router.get('/:topicId', questionController.getQuestionsByTopic);
router.post('/approve/:questionId', questionController.approveQuestion);
router.post('/reject/:questionId', questionController.rejectQuestion);

module.exports = router;
