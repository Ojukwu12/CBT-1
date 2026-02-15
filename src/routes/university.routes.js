const express = require('express');
const universityController = require('../controllers/universityController');
const { verifyToken } = require('../middleware/auth.middleware');
const ApiError = require('../utils/ApiError');

const router = express.Router();

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }
  next();
};

// Admin-only routes
router.post('/', verifyToken, isAdmin, universityController.createUniversity);
router.put('/:id', verifyToken, isAdmin, universityController.updateUniversity);

// Public routes
router.get('/', universityController.listUniversities);
router.get('/:id', universityController.getUniversity);

module.exports = router;
