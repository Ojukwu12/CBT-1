const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

const router = express.Router();

/**
 * Public Routes
 */

/**
 * Register new user
 * POST /api/auth/register
 * Body: { firstName, lastName, email, password, universityId }
 */
router.post(
  '/register',
  validate(registerSchema),
  authController.register
);

/**
 * Login user
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post(
  '/login',
  validate(loginSchema),
  authController.login
);

/**
 * Protected Routes
 */

/**
 * Get current user
 * GET /api/auth/me
 * Headers: Authorization: Bearer token
 */
router.get(
  '/me',
  verifyToken,
  authController.getCurrentUser
);

module.exports = router;
