const express = require('express');
const adminPricingController = require('../controllers/adminPricingController');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');

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
  discountType: Joi.string().valid('percentage', 'fixed').required(),
  discountValue: Joi.number().min(0).required(),
  applicablePlans: Joi.array().items(Joi.string().valid('basic', 'premium')).optional(),
  maxUsageCount: Joi.number().integer().min(1).optional().allow(null),
  maxUsagePerUser: Joi.number().integer().min(1).required(),
  validFrom: Joi.date().required(),
  validUntil: Joi.date().greater(Joi.ref('validFrom')).required(),
});

const updatePromoSchema = Joi.object({
  description: Joi.string().max(200).optional(),
  discountType: Joi.string().valid('percentage', 'fixed').optional(),
  discountValue: Joi.number().min(0).optional(),
  applicablePlans: Joi.array().items(Joi.string().valid('basic', 'premium')).optional(),
  maxUsageCount: Joi.number().integer().min(1).optional().allow(null),
  maxUsagePerUser: Joi.number().integer().min(1).optional(),
  validFrom: Joi.date().optional(),
  validUntil: Joi.date().optional(),
  isActive: Joi.boolean().optional(),
});

router.use(verifyToken, isAdmin);

// Pricing management
router.get('/pricing', adminPricingController.getPlanPricing);
router.put('/pricing/:plan', validate(updatePricingSchema), adminPricingController.updatePlanPricing);
router.get('/pricing/:plan/history', adminPricingController.getPricingHistory);
router.get('/pricing/analytics', adminPricingController.getPricingAnalytics);

// Promo code management
router.post('/promo-codes', validate(createPromoSchema), adminPricingController.createPromoCode);
router.get('/promo-codes', adminPricingController.listPromoCodes);
router.put('/promo-codes/:code', validate(updatePromoSchema), adminPricingController.updatePromoCode);
router.delete('/promo-codes/:code', adminPricingController.deletePromoCode);
router.get('/promo-codes/:code/stats', adminPricingController.getPromoCodeStats);

module.exports = router;
