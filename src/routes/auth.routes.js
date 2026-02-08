const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, resetPasswordTokenQuerySchema, refreshTokenSchema, logoutSchema } = require('../validators/auth.validator');

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
 * Forgot password
 * POST /api/auth/forgot-password
 * Body: { email }
 */
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * Reset password (token or OTP)
 * POST /api/auth/reset-password
 * Body: { email, token? | otp?, newPassword }
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword
);

/**
 * Verify reset token (magic link)
 * GET /api/auth/reset-password?email=...&token=...
 */
router.get(
  '/reset-password',
  validate(resetPasswordTokenQuerySchema, 'query'),
  authController.verifyResetToken
);

/**
 * Refresh token
 * POST /api/auth/refresh
 */
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refreshToken
);

/**
 * Logout
 * POST /api/auth/logout
 */
router.post(
  '/logout',
  validate(logoutSchema),
  authController.logout
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
