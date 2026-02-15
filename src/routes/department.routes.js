const express = require('express');
const departmentController = require('../controllers/departmentController');
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
router.post('/', verifyToken, isAdmin, departmentController.createDepartment);
router.put('/:id', verifyToken, isAdmin, departmentController.updateDepartment);

// Public routes
router.get('/', departmentController.listDepartmentsByUniversity);
router.get('/:id', departmentController.getDepartment);

module.exports = router;
