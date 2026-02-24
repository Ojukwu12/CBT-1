const express = require('express');
const feedbackController = require('../controllers/feedbackController');
const validate = require('../middleware/validate.middleware');
const { feedbackSchema } = require('../validators/feedback.validator');

const router = express.Router();

// Submit feedback
router.post('/', validate(feedbackSchema), feedbackController.submitFeedback);

module.exports = router;
