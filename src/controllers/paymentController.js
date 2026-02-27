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
const PromoCode = require('../models/PromoCode');
const PlanPricing = require('../models/PlanPricing');
const cacheService = require('../services/cacheService');

const logger = new Logger('PaymentController');

const getPendingPaymentWindowStart = () => new Date(Date.now() - 60 * 60 * 1000);

const normalizePromoCodeValue = (promoCode) => {
  if (!promoCode || typeof promoCode !== 'string') return null;
  const normalized = promoCode.trim().toUpperCase();
  return normalized || null;
};

/**
 * Initiate payment
 * POST /api/payments/initialize
 * Body: { plan: 'basic' | 'premium', promoCode?: 'CODE123' }
 */
const initializePayment = asyncHandler(async (req, res) => {
  const { plan, promoCode } = req.body;
  const userId = req.user.id;
  const normalizedPromoCode = normalizePromoCodeValue(promoCode);

  // Get user
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if user already has this plan
  if (user.plan === plan) {
    throw new ApiError(400, `You already have the ${plan} plan`);
  }

  // Idempotency check
  const existingPendingPayment = await Transaction.findOne({
    userId,
    status: 'pending',
    plan,
    createdAt: { $gte: getPendingPaymentWindowStart() },
  });

  if (existingPendingPayment) {
    logger.warn(`User ${userId} attempted duplicate payment initialization for ${plan} plan`);
    throw new ApiError(
      409,
      'You already have a pending payment for this plan. Please complete or cancel it first.'
    );
  }

  // Enforce one promo code per active payment cycle
  const pendingPaymentCycle = await Transaction.findOne({
    userId,
    status: 'pending',
    createdAt: { $gte: getPendingPaymentWindowStart() },
  }).sort({ createdAt: -1 });

  if (pendingPaymentCycle?.promoCode && normalizedPromoCode && pendingPaymentCycle.promoCode !== normalizedPromoCode) {
    throw new ApiError(409, 'Only one promo code is allowed per payment cycle. Complete or cancel your current pending payment first.', {
      lockedPromoCode: pendingPaymentCycle.promoCode,
      pendingReference: pendingPaymentCycle.paystackReference,
    });
  }

  // Get plan pricing
  const pricing = await paystackService.getPlanPricing();
  const planConfig = pricing[plan];
  
  if (!planConfig) {
    throw new ApiError(400, 'Invalid plan selected');
  }

  let originalPrice = planConfig.price;
  let discountAmount = 0;
  let finalAmount = originalPrice;
  let promoCodeDoc = null;

  // Validate and apply promo code if provided
  if (normalizedPromoCode) {
    promoCodeDoc = await PromoCode.findOne({ code: normalizedPromoCode });

    if (!promoCodeDoc) {
      throw new ApiError(404, 'Promo code not found');
    }

    if (!promoCodeDoc.isValid()) {
      throw new ApiError(400, 'Promo code has expired or is no longer valid');
    }

    if (!promoCodeDoc.applicablePlans.includes(plan)) {
      throw new ApiError(400, `Promo code is not applicable to ${plan} plan`);
    }

    if (!promoCodeDoc.canUserUse(userId)) {
      throw new ApiError(400, 'You have already used this promo code');
    }

    // Calculate discount
    discountAmount = promoCodeDoc.calculateDiscount(originalPrice);
    finalAmount = originalPrice - discountAmount;

    logger.info(`Promo code ${normalizedPromoCode} applied: Original ₦${originalPrice}, Discount ₦${discountAmount}, Final ₦${finalAmount}`);
  }

  // Initialize payment with Paystack
  const paymentData = await paystackService.initializePayment(user._id, user.email, plan, {
    userName: `${user.firstName} ${user.lastName}`,
    originalPrice,
    discountAmount,
    finalAmount,
    promoCode: normalizedPromoCode,
  });

  // Create transaction record
  const transaction = new Transaction({
    userId: user._id,
    universityId: null,
    email: user.email,
    plan,
    originalPrice,
    discountAmount,
    amount: finalAmount,
    promoCode: normalizedPromoCode,
    promoCodeId: promoCodeDoc ? promoCodeDoc._id : null,
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
    new ApiResponse(200, {
      ...paymentData,
      pricing: {
        originalPrice,
        discountAmount,
        finalAmount,
        promoCode: normalizedPromoCode,
        savings: discountAmount,
        savingsPercentage: originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0,
      },
      promo: {
        applied: Boolean(promoCodeDoc),
        code: promoCodeDoc?.code || null,
        description: promoCodeDoc?.description || null,
        discountType: promoCodeDoc?.discountType || null,
        discountValue: promoCodeDoc?.discountValue ?? null,
        message: promoCodeDoc
          ? `The new price after promo code is ₦${finalAmount.toLocaleString()}`
          : `No promo applied. Total payable is ₦${finalAmount.toLocaleString()}`,
      },
    }, 'Payment initialized. Redirect user to authorization URL.')
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

  if (paymentResult.email?.toLowerCase() !== existingTransaction.email?.toLowerCase()) {
    logger.error(`Payment verification email mismatch for reference ${reference}`);
    throw new ApiError(400, 'Payment verification data mismatch');
  }

  if (Number(paymentResult.amount) !== Number(existingTransaction.amount)) {
    logger.error(`Payment verification amount mismatch for reference ${reference}`);
    throw new ApiError(400, 'Payment verification amount mismatch');
  }

  if (paymentResult.plan !== existingTransaction.plan) {
    logger.error(`Payment verification plan mismatch for reference ${reference}`);
    throw new ApiError(400, 'Payment verification plan mismatch');
  }

  const pricing = await paystackService.getPlanPricing();
  const verifiedPlanConfig = pricing[existingTransaction.plan];
  if (!verifiedPlanConfig || !verifiedPlanConfig.duration) {
    throw new ApiError(500, 'Plan configuration missing for payment verification');
  }

  // Get user (explicitly exclude password for security)
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Calculate expiry date
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + verifiedPlanConfig.duration);

  // Update user plan atomically
  const oldPlan = user.plan;
  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        plan: existingTransaction.plan,
        planExpiresAt: expiryDate
      }
    },
    { new: true }
  );

  // Update transaction atomically (only if status is still pending to prevent race conditions)
  const transaction = await Transaction.findOneAndUpdate(
    { 
      paystackReference: reference,
      status: 'pending' // Only update if not already processed
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

  // Track promo code usage if one was used
  if (transaction.promoCodeId && transaction.promoCode) {
    try {
      await PromoCode.findByIdAndUpdate(
        transaction.promoCodeId,
        {
          $inc: { usageCount: 1 },
          $push: {
            usedBy: {
              userId: transaction.userId,
              transactionId: transaction._id,
              usedAt: new Date(),
              amount: transaction.amount,
              discountApplied: transaction.discountAmount,
            },
          },
        }
      );
      logger.info(`Promo code ${transaction.promoCode} usage recorded for user ${userId}`);
    } catch (err) {
      logger.error('Error tracking promo code usage:', err);
      // Don't fail payment if promo tracking fails
    }
  }

  // Send success email
  try {
    await emailService.sendPaymentReceiptEmail(user, transaction);

    if (oldPlan !== existingTransaction.plan) {
      await emailService.sendPlanUpgradeEmail(user, oldPlan, existingTransaction.plan, expiryDate);
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
  if (oldPlan !== existingTransaction.plan) {
    await auditLogService.logPlanUpgrade(userId, oldPlan, existingTransaction.plan, transaction._id);
  }

  res.status(200).json(
    new ApiResponse(200, {
      transactionId: transaction._id,
      plan: existingTransaction.plan,
      planExpiresAt: expiryDate,
      message: 'Plan upgraded successfully!',
    }, 'Payment verified and plan updated')
  );
});

/**
 * Get payment plans
 * GET /api/payments/plans
 */
const getPlans = asyncHandler(async (req, res) => {
  const pricingRecords = await cacheService.remember(
    'payments:plans:active',
    async () => PlanPricing.find({ isActive: true }).sort({ plan: 1 }).lean(),
    900
  );
  
  // If no plans in database, return error instead of fallback
  if (pricingRecords.length === 0) {
    throw new ApiError(404, 'No pricing plans configured');
  }

  // Format plans with all admin-configured details
  const plans = pricingRecords.map(record => ({
    id: record.plan,
    plan: record.plan,
    name: record.name,
    price: record.price,
    duration: record.duration,
    features: record.features,
    description: record.description,
    isActive: record.isActive,
  }));

  res.status(200).json(
    new ApiResponse(200, plans, 'Payment plans retrieved')
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

  const { event, data } = req.body || {};

  if (!event || !data) {
    logger.warn(`Webhook rejected: malformed payload from IP ${clientIP}`);
    throw new ApiError(400, 'Invalid webhook payload');
  }

  // Log webhook receipt
  paystackService.logWebhookEvent(event, data, 'received');

  // Only process charge.success events
  if (event !== 'charge.success') {
    logger.info(`Webhook event received: ${event} (ignoring)`);
    return res.status(200).json(
      new ApiResponse(200, null, `Event ${event} received but not processed`)
    );
  }

  const { reference, status, customer, amount } = data;

  if (!reference) {
    throw new ApiError(400, 'Missing transaction reference');
  }

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

  if (!transaction) {
    logger.warn(`Webhook ignored: unknown reference ${reference}`);
    paystackService.logWebhookEvent(event, data, 'unknown_reference');
    return res.status(200).json(
      new ApiResponse(200, { status: 'ignored_unknown_reference' }, 'Webhook acknowledged')
    );
  }

  if (transaction.status !== 'pending') {
    logger.warn(`Webhook ignored: invalid transaction state ${transaction.status} for ${reference}`);
    return res.status(200).json(
      new ApiResponse(200, { status: 'ignored_invalid_state' }, 'Webhook acknowledged')
    );
  }

  const amountInNaira = Math.round(Number(amount) || 0) / 100;
  if (!Number.isFinite(amountInNaira) || amountInNaira <= 0) {
    throw new ApiError(400, 'Invalid webhook amount');
  }

  if (Number(transaction.amount) !== amountInNaira) {
    logger.error(`Webhook amount mismatch for reference ${reference}: expected ${transaction.amount}, got ${amountInNaira}`);
    paystackService.logWebhookEvent(event, data, 'amount_mismatch');
    throw new ApiError(400, 'Payment amount mismatch');
  }

  if (customer?.email && transaction.email?.toLowerCase() !== customer.email.toLowerCase()) {
    logger.error(`Webhook email mismatch for reference ${reference}`);
    paystackService.logWebhookEvent(event, data, 'email_mismatch');
    throw new ApiError(400, 'Payment customer mismatch');
  }

  const pricing = await paystackService.getPlanPricing();
  const transactionPlanConfig = pricing[transaction.plan];
  if (!transactionPlanConfig || !transactionPlanConfig.duration) {
    throw new ApiError(500, 'Plan configuration missing');
  }

  const userId = transaction.userId;
  const plan = transaction.plan;
  const duration = transactionPlanConfig.duration;

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

  transaction = await Transaction.findOneAndUpdate(
    { _id: transaction._id, status: 'pending' },
    {
      $set: {
        status: 'success',
        completedAt: new Date(),
        verifiedAt: new Date(),
        planExpiryDate: expiryDate,
        paystackCustomerId: customer?.customer_code,
        authorizationCode: data.authorization?.authorization_code,
        last4Digits: data.authorization?.last4,
        cardBrand: data.authorization?.brand,
      }
    },
    { new: true }
  );

  if (!transaction) {
    logger.info(`Webhook already processed concurrently: ${reference}`);
    return res.status(200).json(
      new ApiResponse(200, { status: 'already_processed' }, 'Payment already processed')
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

/**
 * Validate promo code
 * POST /api/payments/validate-promo
 * Body: { promoCode: 'CODE123', plan: 'basic' | 'premium' }
 */
const validatePromoCode = asyncHandler(async (req, res) => {
  const { promoCode, plan } = req.body;
  const userId = req.user.id;
  const normalizedPromoCode = normalizePromoCodeValue(promoCode);

  if (!normalizedPromoCode) {
    throw new ApiError(400, 'Promo code is required');
  }

  const pendingPaymentCycle = await Transaction.findOne({
    userId,
    status: 'pending',
    createdAt: { $gte: getPendingPaymentWindowStart() },
  }).sort({ createdAt: -1 });

  if (pendingPaymentCycle?.promoCode && pendingPaymentCycle.promoCode !== normalizedPromoCode) {
    throw new ApiError(409, 'Only one promo code is allowed per payment cycle. Complete or cancel your current pending payment first.', {
      lockedPromoCode: pendingPaymentCycle.promoCode,
      pendingReference: pendingPaymentCycle.paystackReference,
    });
  }

  const promo = await PromoCode.findOne({ code: normalizedPromoCode });

  if (!promo) {
    throw new ApiError(404, 'Promo code not found');
  }

  if (!promo.isValid()) {
    throw new ApiError(400, 'Promo code has expired or is no longer valid');
  }

  if (!promo.applicablePlans.includes(plan)) {
    throw new ApiError(400, `Promo code is not applicable to ${plan} plan`);
  }

  if (!promo.canUserUse(userId)) {
    throw new ApiError(400, 'You have already used this promo code');
  }

  // Get plan pricing
  const pricing = await paystackService.getPlanPricing();
  const planConfig = pricing[plan];
  const originalPrice = planConfig.price;
  const discountAmount = promo.calculateDiscount(originalPrice);
  const finalAmount = originalPrice - discountAmount;

  res.status(200).json(
    new ApiResponse(200, {
      valid: true,
      promoCode: promo.code,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      pricing: {
        originalPrice,
        discountAmount,
        finalAmount,
        savings: discountAmount,
        savingsPercentage: Math.round((discountAmount / originalPrice) * 100),
      },
      message: `The new price after promo code is ₦${finalAmount.toLocaleString()}`,
      validUntil: promo.validUntil,
    }, 'Promo code is valid')
  );
});

module.exports = {
  initializePayment,
  verifyPayment,
  validatePromoCode,
  getPlans,
  getTransactionHistory,
  checkPaymentStatus,
  handleWebhook,
};
