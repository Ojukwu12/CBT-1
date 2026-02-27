const express = require('express');
const adminPricingController = require('../controllers/adminPricingController');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');
const { adminReadLimiter, adminWriteLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }
  next();
};

// Validators
const updatePricingSchema = Joi.object({
  price: Joi.number().min(0).required(),
  name: Joi.string().min(3).max(50).optional(),
  duration: Joi.number().integer().min(1).max(365).optional(),
  features: Joi.array().items(Joi.string()).optional(),
  reason: Joi.string().max(200).optional(),
});

const createPromoSchema = Joi.object({
  code: Joi.string().min(3).max(20).uppercase().required(),
  description: Joi.string().max(200).optional(),
  discountType: Joi.string().trim().valid('percentage', 'fixed', 'fixed (₦)', 'fixed (n)', 'percent', 'percentage (%)').required(),
  discountValue: Joi.number().min(0).required(),
  applicablePlans: Joi.array().items(Joi.string().valid('free', 'basic', 'premium')).optional(),
  maxUsageCount: Joi.number().integer().min(1).optional().allow(null, ''),
  maxTotalUsage: Joi.number().integer().min(1).optional().allow(null, ''),
  maxUsagePerUser: Joi.number().integer().min(1).optional(),
  maxUsesPerUser: Joi.number().integer().min(1).optional(),
  validFrom: Joi.alternatives().try(Joi.date(), Joi.string().trim()).required(),
  validUntil: Joi.alternatives().try(Joi.date(), Joi.string().trim()).required(),
}).custom((value, helpers) => {
  if (value.maxUsagePerUser === undefined && value.maxUsesPerUser === undefined) {
    return helpers.error('any.custom', { message: 'maxUsagePerUser or maxUsesPerUser is required' });
  }
  return value;
});

const updatePromoSchema = Joi.object({
  description: Joi.string().max(200).optional(),
  discountType: Joi.string().trim().valid('percentage', 'fixed', 'fixed (₦)', 'fixed (n)', 'percent', 'percentage (%)').optional(),
  discountValue: Joi.number().min(0).optional(),
  applicablePlans: Joi.array().items(Joi.string().valid('free', 'basic', 'premium')).optional(),
  maxUsageCount: Joi.number().integer().min(1).optional().allow(null, ''),
  maxTotalUsage: Joi.number().integer().min(1).optional().allow(null, ''),
  maxUsagePerUser: Joi.number().integer().min(1).optional(),
  maxUsesPerUser: Joi.number().integer().min(1).optional(),
  validFrom: Joi.alternatives().try(Joi.date(), Joi.string().trim()).optional(),
  validUntil: Joi.alternatives().try(Joi.date(), Joi.string().trim()).optional(),
  isActive: Joi.boolean().optional(),
});

router.use(verifyToken, isAdmin);

// Pricing management
router.get('/pricing', adminReadLimiter, adminPricingController.getPlanPricing);
router.put('/pricing/:plan', adminWriteLimiter, validate(updatePricingSchema), adminPricingController.updatePlanPricing);
router.delete('/pricing/:plan', adminWriteLimiter, adminPricingController.deletePlanPricing);
router.get('/pricing/:plan/history', adminReadLimiter, adminPricingController.getPricingHistory);
router.get('/pricing/analytics', adminReadLimiter, adminPricingController.getPricingAnalytics);

// Promo code management
router.post('/promo-codes', adminWriteLimiter, validate(createPromoSchema), adminPricingController.createPromoCode);
router.get('/promo-codes', adminReadLimiter, adminPricingController.listPromoCodes);
router.put('/promo-codes/:code', adminWriteLimiter, validate(updatePromoSchema), adminPricingController.updatePromoCode);
router.delete('/promo-codes/:code', adminWriteLimiter, adminPricingController.deletePromoCode);
router.get('/promo-codes/:code/stats', adminReadLimiter, adminPricingController.getPromoCodeStats);

module.exports = router;
