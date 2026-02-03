const express = require('express');
const questionController = require('../controllers/questionController');

const router = express.Router({ mergeParams: true });

router.get('/pending/:universityId', questionController.getPendingQuestions);
router.get('/stats/:topicId', questionController.getQuestionStats);
router.get('/random/:topicId', questionController.getRandomQuestions);
router.get('/:topicId', questionController.getQuestionsByTopic);
router.post('/approve/:questionId', questionController.approveQuestion);
router.post('/reject/:questionId', questionController.rejectQuestion);

module.exports = router;
