const PlanPricing = require('../models/PlanPricing');
const PromoCode = require('../models/PromoCode');
const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Logger = require('../utils/logger');
const cacheService = require('../services/cacheService');

const logger = new Logger('AdminPricingController');

const normalizeDiscountType = (value) => {
  if (!value) return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized.includes('fixed')) return 'fixed';
  if (normalized.includes('percent')) return 'percentage';
  return normalized;
};

const parseDateInput = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const raw = String(value).trim();
  const ddmmyyyyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, dd, mm, yyyy] = ddmmyyyyMatch;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), 0, 0, 0, 0);
  }

  return new Date(raw);
};

const parseOptionalUsageLimit = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return Number(value);
};

/**
 * Get current plan pricing
 * GET /api/admin/pricing
 */
const getPlanPricing = asyncHandler(async (req, res) => {
  const pricing = await PlanPricing.find({ isActive: true }).sort({ plan: 1 });

  res.status(200).json({
    success: true,
    data: pricing,
  });
});

/**
 * Update plan pricing
 * PUT /api/admin/pricing/:plan
 */
const updatePlanPricing = asyncHandler(async (req, res) => {
  const { plan } = req.params;
  const { price, name, duration, features, reason } = req.body;

  let pricing = await PlanPricing.findOne({ plan });

  if (!pricing) {
    // Create new pricing if it doesn't exist
    pricing = new PlanPricing({
      plan,
      name: name || (plan === 'basic' ? 'Basic' : 'Premium'),
      price,
      duration: duration || 30,
      features: features || [],
      isActive: true,
      updatedBy: req.user.id,
    });
  } else {
    // Archive old price in history
    pricing.priceHistory.push({
      price: pricing.price,
      changedAt: new Date(),
      changedBy: req.user.id,
      reason: reason || 'Price update',
    });

    // Update pricing
    if (price !== undefined) pricing.price = price;
    if (name) pricing.name = name;
    if (duration) pricing.duration = duration;
    if (features) pricing.features = features;
    pricing.isActive = true;
    pricing.updatedBy = req.user.id;
  }

  await pricing.save();
  await cacheService.delByPrefix('payments:plans:');

  logger.info(`Plan pricing updated for ${plan} by admin ${req.user.id}: ₦${price}`);

  res.status(200).json({
    success: true,
    data: pricing,
    message: 'Plan pricing updated successfully',
  });
});

/**
 * Delete (deactivate) a plan pricing configuration
 * DELETE /api/admin/pricing/:plan
 */
const deletePlanPricing = asyncHandler(async (req, res) => {
  const { plan } = req.params;

  const pricing = await PlanPricing.findOne({ plan });
  if (!pricing) {
    throw new ApiError(404, 'Pricing not found');
  }

  if (!pricing.isActive) {
    return res.status(200).json({
      success: true,
      message: `${plan} pricing is already deleted`,
    });
  }

  pricing.isActive = false;
  pricing.updatedBy = req.user.id;
  await pricing.save();
  await cacheService.delByPrefix('payments:plans:');

  logger.info(`Plan pricing deleted for ${plan} by admin ${req.user.id}`);

  res.status(200).json({
    success: true,
    message: `${plan} pricing deleted successfully. Existing users keep their current tier until expiry or manual plan change.`,
  });
});

/**
 * Get pricing history
 * GET /api/admin/pricing/:plan/history
 */
const getPricingHistory = asyncHandler(async (req, res) => {
  const { plan } = req.params;

  const pricing = await PlanPricing.findOne({ plan })
    .populate('updatedBy', 'firstName lastName email')
    .populate('priceHistory.changedBy', 'firstName lastName email');

  if (!pricing) {
    throw new ApiError(404, 'Pricing not found');
  }

  res.status(200).json({
    success: true,
    data: {
      currentPrice: pricing.price,
      history: pricing.priceHistory,
    },
  });
});

/**
 * Create promo code
 * POST /api/admin/promo-codes
 */
const createPromoCode = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    applicablePlans,
    maxUsageCount,
    maxTotalUsage,
    maxUsagePerUser,
    maxUsesPerUser,
    validFrom,
    validUntil,
  } = req.body;

  const normalizedDiscountType = normalizeDiscountType(discountType);
  const normalizedValidFrom = parseDateInput(validFrom);
  const normalizedValidUntil = parseDateInput(validUntil);
  const normalizedMaxUsageCount = parseOptionalUsageLimit(maxUsageCount ?? maxTotalUsage);
  const normalizedMaxUsagePerUser = Number(maxUsagePerUser ?? maxUsesPerUser ?? 1);

  if (!normalizedValidFrom || Number.isNaN(normalizedValidFrom.getTime())) {
    throw new ApiError(400, 'validFrom must be a valid date');
  }

  if (!normalizedValidUntil || Number.isNaN(normalizedValidUntil.getTime())) {
    throw new ApiError(400, 'validUntil must be a valid date');
  }

  if (normalizedValidUntil <= normalizedValidFrom) {
    throw new ApiError(400, 'validUntil must be later than validFrom');
  }

  if (!['fixed', 'percentage'].includes(normalizedDiscountType)) {
    throw new ApiError(400, 'discountType must be fixed or percentage');
  }

  // Check if code already exists
  const existingPromo = await PromoCode.findOne({ code: code.toUpperCase() });
  if (existingPromo) {
    throw new ApiError(400, 'Promo code already exists');
  }

  const promoCode = new PromoCode({
    code: code.toUpperCase(),
    description,
    discountType: normalizedDiscountType,
    discountValue,
    applicablePlans: applicablePlans || ['basic', 'premium'],
    maxUsageCount: normalizedMaxUsageCount,
    maxUsagePerUser: normalizedMaxUsagePerUser,
    validFrom: normalizedValidFrom,
    validUntil: normalizedValidUntil,
    isActive: true,
    createdBy: req.user.id,
  });

  await promoCode.save();

  logger.info(`Promo code created: ${code} by admin ${req.user.id}`);

  res.status(201).json({
    success: true,
    data: promoCode,
    message: 'Promo code created successfully',
  });
});

/**
 * List promo codes
 * GET /api/admin/promo-codes
 */
const listPromoCodes = asyncHandler(async (req, res) => {
  const { isActive, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const skip = (page - 1) * limit;

  const [promoCodes, total] = await Promise.all([
    PromoCode.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    PromoCode.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: promoCodes,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit) || 1,
    },
  });
});

/**
 * Update promo code
 * PUT /api/admin/promo-codes/:code
 */
const updatePromoCode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const updates = { ...req.body };

  if (updates.discountType !== undefined) {
    updates.discountType = normalizeDiscountType(updates.discountType);
    if (!['fixed', 'percentage'].includes(updates.discountType)) {
      throw new ApiError(400, 'discountType must be fixed or percentage');
    }
  }

  if (updates.validFrom !== undefined) {
    const parsed = parseDateInput(updates.validFrom);
    if (!parsed || Number.isNaN(parsed.getTime())) {
      throw new ApiError(400, 'validFrom must be a valid date');
    }
    updates.validFrom = parsed;
  }

  if (updates.validUntil !== undefined) {
    const parsed = parseDateInput(updates.validUntil);
    if (!parsed || Number.isNaN(parsed.getTime())) {
      throw new ApiError(400, 'validUntil must be a valid date');
    }
    updates.validUntil = parsed;
  }

  if (updates.maxTotalUsage !== undefined && updates.maxUsageCount === undefined) {
    updates.maxUsageCount = parseOptionalUsageLimit(updates.maxTotalUsage);
  }

  if (updates.maxUsesPerUser !== undefined && updates.maxUsagePerUser === undefined) {
    updates.maxUsagePerUser = Number(updates.maxUsesPerUser);
  }

  const promoCode = await PromoCode.findOne({ code: code.toUpperCase() });
  if (!promoCode) {
    throw new ApiError(404, 'Promo code not found');
  }

  // Update fields
  const allowedUpdates = [
    'description',
    'discountType',
    'discountValue',
    'applicablePlans',
    'maxUsageCount',
    'maxUsagePerUser',
    'validFrom',
    'validUntil',
    'isActive',
  ];

  allowedUpdates.forEach((field) => {
    if (updates[field] !== undefined) {
      promoCode[field] = updates[field];
    }
  });

  await promoCode.save();

  logger.info(`Promo code updated: ${code} by admin ${req.user.id}`);

  res.status(200).json({
    success: true,
    data: promoCode,
    message: 'Promo code updated successfully',
  });
});

/**
 * Delete promo code
 * DELETE /api/admin/promo-codes/:code
 */
const deletePromoCode = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const promoCode = await PromoCode.findOneAndDelete({ code: code.toUpperCase() });
  if (!promoCode) {
    throw new ApiError(404, 'Promo code not found');
  }

  logger.info(`Promo code deleted: ${code} by admin ${req.user.id}`);

  res.status(200).json({
    success: true,
    message: 'Promo code deleted successfully',
  });
});

/**
 * Get promo code usage stats
 * GET /api/admin/promo-codes/:code/stats
 */
const getPromoCodeStats = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const promoCode = await PromoCode.findOne({ code: code.toUpperCase() })
    .populate('usedBy.userId', 'firstName lastName email')
    .populate('usedBy.transactionId');

  if (!promoCode) {
    throw new ApiError(404, 'Promo code not found');
  }

  const totalDiscountGiven = promoCode.usedBy.reduce(
    (sum, usage) => sum + (usage.discountApplied || 0),
    0
  );
  const totalRevenue = promoCode.usedBy.reduce(
    (sum, usage) => sum + (usage.amount || 0),
    0
  );

  res.status(200).json({
    success: true,
    data: {
      code: promoCode.code,
      description: promoCode.description,
      usageCount: promoCode.usageCount,
      maxUsageCount: promoCode.maxUsageCount,
      totalDiscountGiven,
      totalRevenue,
      usages: promoCode.usedBy,
      isActive: promoCode.isActive,
      validFrom: promoCode.validFrom,
      validUntil: promoCode.validUntil,
    },
  });
});

/**
 * Get pricing and promo analytics
 * GET /api/admin/pricing/analytics
 */
const getPricingAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const matchFilter = { status: 'success' };
  if (Object.keys(dateFilter).length > 0) {
    matchFilter.completedAt = dateFilter;
  }

  // Revenue breakdown by plan
  const revenueByPlan = await Transaction.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$plan',
        totalRevenue: { $sum: '$amount' },
        totalDiscount: { $sum: '$discountAmount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
      },
    },
  ]);

  // Promo code usage
  const promoUsage = await Transaction.aggregate([
    { $match: { ...matchFilter, promoCode: { $ne: null } } },
    {
      $group: {
        _id: '$promoCode',
        usageCount: { $sum: 1 },
        totalDiscount: { $sum: '$discountAmount' },
        totalRevenue: { $sum: '$amount' },
      },
    },
    { $sort: { usageCount: -1 } },
  ]);

  // Total stats
  const totalStats = await Transaction.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalOriginalPrice: { $sum: '$originalPrice' },
        totalDiscount: { $sum: '$discountAmount' },
        transactionCount: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      revenueByPlan,
      promoUsage,
      totalStats: totalStats[0] || {
        totalRevenue: 0,
        totalOriginalPrice: 0,
        totalDiscount: 0,
        transactionCount: 0,
      },
    },
  });
});

module.exports = {
  getPlanPricing,
  updatePlanPricing,
  getPricingHistory,
  deletePlanPricing,
  createPromoCode,
  listPromoCodes,
  updatePromoCode,
  deletePromoCode,
  getPromoCodeStats,
  getPricingAnalytics,
};
