const express = require('express');
const courseController = require('../controllers/courseController');
const { verifyToken } = require('../middleware/auth.middleware');
const ApiError = require('../utils/ApiError');

const router = express.Router({ mergeParams: true });

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }
  next();
};

// Admin-only routes
router.post('/', verifyToken, isAdmin, courseController.createCourse);
router.put('/:id', verifyToken, isAdmin, courseController.updateCourse);

// Public routes
router.get('/', courseController.listCoursesByDepartment);
router.get('/:id', courseController.getCourse);

module.exports = router;
