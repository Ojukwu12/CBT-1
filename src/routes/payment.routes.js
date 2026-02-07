/**
 * Payment Routes
 * All payment-related endpoints
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth.middleware');
const { paymentInitializeLimiter, paymentVerifyLimiter, webhookLimiter } = require('../middleware/rateLimit.middleware');
const validate = require('../middleware/validate.middleware');
const {
  initializePaymentSchema,
  verifyPaymentSchema,
  getTransactionHistorySchema,
  checkPaymentStatusSchema,
} = require('../validators/payment.validator');

/**
 * Public routes - no authentication needed
 */

/**
 * Get all payment plans
 * GET /api/payments/plans
 */
router.get('/plans', paymentController.getPlans);

/**
 * Check payment status by reference
 * GET /api/payments/status/:reference
 * Params: reference (Paystack reference)
 */
router.get(
  '/status/:reference',
  validate(checkPaymentStatusSchema, 'params'),
  paymentController.checkPaymentStatus
);

/**
 * Protected routes - authentication required
 */

/**
 * Initialize payment (start checkout)
 * POST /api/payments/initialize
 * Headers: Authorization: Bearer token
 * Body: { plan: "free|basic|premium" }
 */
router.post(
  '/initialize',
  verifyToken,
  paymentInitializeLimiter,
  validate(initializePaymentSchema),
  paymentController.initializePayment
);

/**
 * Verify payment (callback/confirmation)
 * POST /api/payments/verify
 * Headers: Authorization: Bearer token
 * Body: { reference: "paystack_reference" }
 */
router.post(
  '/verify',
  verifyToken,
  paymentVerifyLimiter,
  validate(verifyPaymentSchema),
  paymentController.verifyPayment
);

/**
 * Get user's transaction history
 * GET /api/payments/transactions
 * Headers: Authorization: Bearer token
 * Query: page (default: 1), limit (default: 10), status (optional)
 */
router.get(
  '/transactions',
  verifyToken,
  validate(getTransactionHistorySchema, 'query'),
  paymentController.getTransactionHistory
);

/**
 * Webhook endpoint for Paystack callbacks
 * POST /api/payments/webhook
 * No authentication - verified by Paystack signature
 * Headers: x-paystack-signature
 * Body: { event, data }
 */
router.post(
  '/webhook',
  webhookLimiter,
  paymentController.handleWebhook
);

module.exports = router;
