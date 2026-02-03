const express = require('express');
const courseController = require('../controllers/courseController');

const router = express.Router({ mergeParams: true });

router.post('/', courseController.createCourse);
router.get('/', courseController.listCoursesByDepartment);
router.get('/:id', courseController.getCourse);
router.put('/:id', courseController.updateCourse);

module.exports = router;
