const express = require('express');
const topicController = require('../controllers/topicController');

const router = express.Router({ mergeParams: true });

router.post('/', topicController.createTopic);
router.get('/', topicController.listTopicsByCourse);
router.get('/:id', topicController.getTopic);
router.put('/:id', topicController.updateTopic);

module.exports = router;
