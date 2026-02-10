/**
 * Payment Controller
 * Handles all payment-related operations
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const Logger = require('../utils/logger');
const paystackService = require('../services/paystackService');
const emailService = require('../services/emailService');
const userService = require('../services/userService');
const auditLogService = require('../services/auditLogService');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const logger = new Logger('PaymentController');

/**
 * Initiate payment
 * POST /api/payments/initialize
 * Body: { plan: 'basic' | 'premium' }
 */
const initializePayment = asyncHandler(async (req, res) => {
  const { plan } = req.body; // Already validated by Joi
  const userId = req.user.id; // From JWT token

  // Get user from database (explicitly exclude password for security)
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if user already has this plan
  if (user.plan === plan) {
    throw new ApiError(400, `You already have the ${plan} plan`);
  }

  // Idempotency check: Prevent multiple pending payments for the same plan
  const existingPendingPayment = await Transaction.findOne({
    userId,
    status: 'pending',
    plan,
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Within last hour
  });

  if (existingPendingPayment) {
    logger.warn(`User ${userId} attempted duplicate payment initialization for ${plan} plan`);
    throw new ApiError(
      409,
      'You already have a pending payment for this plan. Please complete or cancel it first.'
    );
  }

  // Initialize payment with Paystack
  const paymentData = await paystackService.initializePayment(user._id, user.email, plan, {
    userName: `${user.firstName} ${user.lastName}`,
  });

  // Create transaction record (pending)
  const transaction = new Transaction({
    userId: user._id,
    universityId: user.universityId,
    email: user.email,
    plan,
    amount: paystackService.getPlanPricing()[plan].price,
    paystackReference: paymentData.reference,
    status: 'pending',
    initiatedAt: new Date(),
  });

  await transaction.save();

  // Log payment initialization
  await auditLogService.logPaymentInit(
    user._id,
    plan,
    transaction._id,
    req.ip || req.connection.remoteAddress,
    req.get('user-agent')
  );

  res.status(200).json(
    new ApiResponse(200, paymentData, 'Payment initialized. Redirect user to authorization URL.')
  );
});

/**
 * Verify payment
 * POST /api/payments/verify
 * Body: { reference: 'paystack_reference' }
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { reference } = req.body; // Already validated by Joi
  const userId = req.user.id; // From JWT token

  // Check if payment already processed to prevent double-processing (race condition protection)
  const existingTransaction = await Transaction.findOne({ paystackReference: reference });
  
  if (!existingTransaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  if (existingTransaction.userId.toString() !== userId) {
    throw new ApiError(403, 'You do not have permission to verify this payment');
  }

  if (existingTransaction.status === 'success') {
    // Payment already processed - return existing data
    logger.warn(`Payment already processed: ${reference}`);
    return res.status(200).json(
      new ApiResponse(200, {
        status: 'already_processed',
        transactionId: existingTransaction._id,
      }, 'Payment was already processed')
    );
  }

  // Verify with Paystack
  const paymentResult = await paystackService.verifyPayment(reference);

  if (!paymentResult.success) {
    // Update transaction status
    await Transaction.findOneAndUpdate(
      { paystackReference: reference },
      { status: 'failed', failureReason: paymentResult.message },
      { new: true }
    );

    throw new ApiError(400, 'Payment verification failed');
  }

  // Get user (explicitly exclude password for security)
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Calculate expiry date
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + paymentResult.planExpiryDays);

  // Update user plan atomically
  const oldPlan = user.plan;
  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        plan: paymentResult.plan,
        planExpiresAt: expiryDate
      }
    },
    { new: true }
  );

  // Update transaction atomically (only if status is still pending to prevent race conditions)
  const transaction = await Transaction.findOneAndUpdate(
    { 
      paystackReference: reference,
      status: { $in: ['pending', 'initiated'] } // Only update if not already processed
    },
    {
      $set: {
        status: 'success',
        completedAt: new Date(),
        verifiedAt: new Date(),
        planExpiryDate: expiryDate,
      }
    },
    { new: true }
  );

  if (!transaction) {
    // Transaction was already updated by another request (race condition occurred)
    logger.warn(`Concurrent payment verification detected: ${reference}`);
    throw new ApiError(409, 'Payment was already being processed by another request');
  }

  // Send success email
  try {
    await emailService.sendPaymentReceiptEmail(user, transaction);

    if (oldPlan !== paymentResult.plan) {
      await emailService.sendPlanUpgradeEmail(user, oldPlan, paymentResult.plan, expiryDate);
    }
  } catch (err) {
    // Log email error but don't fail payment verification
    logger.error('Email notification failed:', err);
  }

  // Log successful payment verification
  await auditLogService.logPaymentVerify(
    userId,
    transaction._id,
    'success',
    transaction.amount,
    req.ip || req.connection.remoteAddress,
    req.get('user-agent')
  );

  // Log plan upgrade
  if (oldPlan !== paymentResult.plan) {
    await auditLogService.logPlanUpgrade(userId, oldPlan, paymentResult.plan, transaction._id);
  }

  res.status(200).json(
    new ApiResponse(200, {
      transactionId: transaction._id,
      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
      message: 'Plan upgraded successfully!',
    }, 'Payment verified and plan updated')
  );
});

/**
 * Get payment plans
 * GET /api/payments/plans
 */
const getPlans = asyncHandler(async (req, res) => {
  const plans = paystackService.getPlanPricing();

  const plansWithFeatures = Object.entries(plans).map(([key, value]) => ({
    id: key,
    ...value,
  }));

  res.status(200).json(
    new ApiResponse(200, plansWithFeatures, 'Payment plans retrieved')
  );
});

/**
 * Get user transaction history
 * GET /api/payments/transactions
 * Headers: Authorization: Bearer token
 */
const getTransactionHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From JWT token
  const { page = 1, limit = 10, status } = req.query; // Already validated by Joi

  // Validate pagination parameters to prevent abuse
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter = { userId };
  if (status) {
    filter.status = status;
  }

  // Fetch transactions
  const transactions = await Transaction.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Get total count
  const totalCount = await Transaction.countDocuments(filter);

  const summary = {
    totalTransactions: totalCount,
    totalSpent: transactions
      .filter((t) => t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0),
    lastTransaction: transactions[0] || null,
  };

  res.status(200).json(
    new ApiResponse(200, {
      summary,
      transactions,
      pagination: {
        currentPage: parseInt(page),
        pageSize: parseInt(limit),
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    }, 'Transaction history retrieved')
  );
});

/**
 * Check payment status
 * GET /api/payments/status/:reference
 */
const checkPaymentStatus = asyncHandler(async (req, res) => {
  const { reference } = req.params; // Already validated by Joi

  const transaction = await Transaction.findOne({
    paystackReference: reference,
  });

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  if (req.user.role !== 'admin' && transaction.userId.toString() !== req.user.id) {
    throw new ApiError(403, 'You do not have permission to view this transaction');
  }

  res.status(200).json(
    new ApiResponse(200, transaction, 'Payment status retrieved')
  );
});

/**
 * Webhook handler for Paystack payment callbacks
 * POST /api/payments/webhook
 * No authentication required - verified by Paystack signature
 */
const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!signature) {
    logger.warn(`Webhook rejected: Missing signature from IP ${clientIP}`);
    throw new ApiError(401, 'Missing webhook signature');
  }

  // Verify webhook signature (primary security)
  const isValid = paystackService.verifyWebhookSignature(req.body, signature, req.rawBody);
  if (!isValid) {
    logger.warn(`Webhook rejected: Invalid signature from IP ${clientIP}`);
    throw new ApiError(401, 'Invalid webhook signature');
  }

  // Optional: Verify IP is from Paystack (secondary security)
  const isFromPaystack = paystackService.isFromPaystackIP(clientIP);
  if (!isFromPaystack) {
    logger.warn(`Webhook warning: Received from non-Paystack IP ${clientIP}`);
    // Note: We continue processing even if IP check fails since signature is valid
    // This allows for testing and flexibility
  }

  const { event, data } = req.body;

  // Log webhook receipt
  paystackService.logWebhookEvent(event, data, 'received');

  // Only process charge.success events
  if (event !== 'charge.success') {
    logger.info(`Webhook event received: ${event} (ignoring)`);
    return res.status(200).json(
      new ApiResponse(200, null, `Event ${event} received but not processed`)
    );
  }

  const { reference, status, customer, amount, metadata } = data;

  logger.info(`Processing webhook for payment: ${reference}`);

  // Check if transaction already exists
  let transaction = await Transaction.findOne({ paystackReference: reference });

  if (transaction && transaction.status === 'success') {
    // Payment already processed - idempotent response
    logger.info(`Payment already processed: ${reference}`);
    paystackService.logWebhookEvent(event, data, 'already_processed');
    return res.status(200).json(
      new ApiResponse(200, { status: 'already_processed' }, 'Payment already processed')
    );
  }

  if (status !== 'success') {
    // Payment failed
    if (transaction) {
      await Transaction.findByIdAndUpdate(
        transaction._id,
        {
          $set: {
            status: 'failed',
            failureReason: `Webhook status: ${status}`,
          }
        }
      );
    }
    logger.warn(`Payment failed via webhook: ${reference} - Status: ${status}`);
    paystackService.logWebhookEvent(event, data, 'failed');
    return res.status(200).json(
      new ApiResponse(200, null, `Payment ${status}`)
    );
  }

  // Extract and validate metadata
  const { userId, plan, duration } = metadata;
  const validPlans = ['free', 'basic', 'premium'];

  if (!userId || !plan || !duration) {
    logger.error(`Invalid metadata in webhook: ${reference}`, { metadata });
    paystackService.logWebhookEvent(event, data, 'invalid_metadata');
    throw new ApiError(400, 'Invalid webhook metadata');
  }

  // Validate plan is one of the allowed values
  if (!validPlans.includes(plan)) {
    logger.error(`Invalid plan in webhook: ${reference} - plan: ${plan}`, { metadata });
    paystackService.logWebhookEvent(event, data, 'invalid_plan');
    throw new ApiError(400, 'Invalid plan value');
  }

  // Validate duration is a positive number
  if (typeof duration !== 'number' || duration <= 0 || duration > 365) {
    logger.error(`Invalid duration in webhook: ${reference} - duration: ${duration}`, { metadata });
    paystackService.logWebhookEvent(event, data, 'invalid_duration');
    throw new ApiError(400, 'Invalid duration (must be 1-365 days)');
  }

  // Get user
  const user = await User.findById(userId).select('-password');
  if (!user) {
    logger.error(`User not found for webhook: ${reference} - userId: ${userId}`);
    paystackService.logWebhookEvent(event, data, 'user_not_found');
    throw new ApiError(404, 'User not found');
  }

  // Calculate expiry date
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + duration);

  // Store old plan for email notification
  const oldPlan = user.plan;

  // Update user plan atomically
  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        plan,
        planExpiresAt: expiryDate
      }
    },
    { new: true }
  );

  // Update or create transaction atomically
  if (!transaction) {
    // Create new transaction record (webhook came before client verify)
    transaction = new Transaction({
      userId,
      universityId: user.universityId,
      email: customer.email,
      plan,
      amount: Math.round(amount) / 100, // Convert Kobo to Naira (integer math)
      paystackReference: reference,
      status: 'success',
      initiatedAt: new Date(),
      completedAt: new Date(),
      verifiedAt: new Date(),
      planExpiryDate: expiryDate,
      paystackCustomerId: customer.customer_code,
      authorizationCode: data.authorization?.authorization_code,
      last4Digits: data.authorization?.last4,
      cardBrand: data.authorization?.brand,
    });
    await transaction.save();
  } else {
    // Update existing transaction
    transaction = await Transaction.findByIdAndUpdate(
      transaction._id,
      {
        $set: {
          status: 'success',
          completedAt: new Date(),
          verifiedAt: new Date(),
          planExpiryDate: expiryDate,
          paystackCustomerId: customer.customer_code,
          authorizationCode: data.authorization?.authorization_code,
          last4Digits: data.authorization?.last4,
          cardBrand: data.authorization?.brand,
        }
      },
      { new: true }
    );
  }

  // Send success emails (fire and forget)
  try {
    emailService.sendPaymentReceiptEmail(user, transaction)
      .catch(err => logger.error('Receipt email failed:', err));

    if (oldPlan !== plan) {
      emailService.sendPlanUpgradeEmail(user, oldPlan, plan, expiryDate)
        .catch(err => logger.error('Upgrade email failed:', err));
    }
  } catch (err) {
    logger.error('Email notification error:', err);
    // Don't fail webhook if emails fail
  }

  logger.info(`Webhook processed successfully: ${reference}`);
  paystackService.logWebhookEvent(event, data, 'success');

  res.status(200).json(
    new ApiResponse(200, {
      transactionId: transaction._id,
      reference,
      status: 'success',
      plan,
    }, 'Payment processed via webhook')
  );
});

module.exports = {
  initializePayment,
  verifyPayment,
  getPlans,
  getTransactionHistory,
  checkPaymentStatus,
  handleWebhook,
};
