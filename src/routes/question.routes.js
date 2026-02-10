const express = require('express');
const questionController = require('../controllers/questionController');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { questionIdSchema } = require('../validators/question.validator');
const ApiError = require('../utils/ApiError');

const router = express.Router({ mergeParams: true });

const isAdmin = (req, res, next) => {
	if (!req.user || req.user.role !== 'admin') {
		return next(new ApiError(403, 'Admin access required'));
	}
	next();
};

router.use(verifyToken);

router.get('/', questionController.listQuestions);
router.post('/', isAdmin, questionController.createQuestion);
router.get('/pending/:universityId', isAdmin, questionController.getPendingQuestions);
router.get('/stats/:topicId', questionController.getQuestionStats);
router.get('/random/:topicId', questionController.getRandomQuestions);
router.get('/:topicId', questionController.getQuestionsByTopic);
router.post('/approve/:questionId', isAdmin, questionController.approveQuestion);
router.post('/reject/:questionId', isAdmin, questionController.rejectQuestion);
router.delete('/:questionId', isAdmin, validate(questionIdSchema, 'params'), questionController.deleteQuestion);

module.exports = router;
