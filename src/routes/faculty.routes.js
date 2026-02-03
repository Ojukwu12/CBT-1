const express = require('express');
const facultyController = require('../controllers/facultyController');

const router = express.Router({ mergeParams: true });

router.post('/', facultyController.createFaculty);
router.get('/', facultyController.listFacultiesByUniversity);
router.get('/:id', facultyController.getFaculty);
router.put('/:id', facultyController.updateFaculty);

module.exports = router;
