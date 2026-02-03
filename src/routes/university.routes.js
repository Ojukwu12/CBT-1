const express = require('express');
const universityController = require('../controllers/universityController');

const router = express.Router();

router.post('/', universityController.createUniversity);
router.get('/', universityController.listUniversities);
router.get('/:id', universityController.getUniversity);
router.put('/:id', universityController.updateUniversity);

module.exports = router;
