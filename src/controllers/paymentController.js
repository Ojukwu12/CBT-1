/**
 * Payment Controller
 * Handles all payment-related operations
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Logger = require('../utils/logger');
const paystackService = require('../services/paystackService');
const emailService = require('../services/emailService');
const userService = require('../services/userService');
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

  // Get user from database
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if user already has this plan
  if (user.plan === plan) {
    throw new ApiError(400, `You already have the ${plan} plan`);
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

  // Get user and update plan
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Calculate expiry date
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + paymentResult.planExpiryDays);

  // Update user plan
  const oldPlan = user.plan;
  user.plan = paymentResult.plan;
  user.planExpiresAt = expiryDate;
  await user.save();

  // Update transaction
  const transaction = await Transaction.findOneAndUpdate(
    { paystackReference: reference },
    {
      status: 'success',
      completedAt: new Date(),
      verifiedAt: new Date(),
      planExpiryDate: expiryDate,
    },
    { new: true }
  );

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

  // Build filter
  const filter = { userId };
  if (status) {
    filter.status = status;
  }

  // Calculate skip
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get transactions
  const transactions = await Transaction.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

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

  res.status(200).json(
    new ApiResponse(200, transaction, 'Payment status retrieved')
  );
});

module.exports = {
  initializePayment,
  verifyPayment,
  getPlans,
  getTransactionHistory,
  checkPaymentStatus,
};
