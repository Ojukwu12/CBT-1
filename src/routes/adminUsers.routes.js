const express = require('express');
const router = express.Router();
const AdminUserController = require('../controllers/adminUserController');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const ApiError = require('../utils/ApiError');
const Joi = require('joi');

// Admin role verification middleware
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }
  next();
};

// Validators
const userIdSchema = Joi.object({
  userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
});

const getAllUsersSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  plan: Joi.string().valid('free', 'basic', 'premium'),
  role: Joi.string().valid('student', 'admin'),
  isActive: Joi.string().valid('true', 'false'),
  search: Joi.string().trim().min(1).max(200),
  universityId: Joi.string(),
});

const banUserSchema = Joi.object({
  reason: Joi.string().required().min(5).max(500),
  duration: Joi.string().valid('7days', '30days', '90days', 'permanent'),
});

const roleChangeSchema = Joi.object({
  newRole: Joi.string().valid('student', 'admin').required(),
});

const downgradePlanSchema = Joi.object({
  reason: Joi.string().optional().default('Policy violation'),
});

const sendNotificationSchema = Joi.object({
  subject: Joi.string().required().min(5).max(100),
  message: Joi.string().required().min(10).max(1000),
});

// Routes
router.get('/', verifyToken, isAdmin, validate(getAllUsersSchema, 'query'), AdminUserController.getAllUsers);
router.get('/:userId', verifyToken, isAdmin, validate(userIdSchema, 'params'), AdminUserController.getUser);

router.post('/:userId/ban', verifyToken, isAdmin, validate(userIdSchema, 'params'), validate(banUserSchema), AdminUserController.banUser);
router.post('/:userId/unban', verifyToken, isAdmin, validate(userIdSchema, 'params'), AdminUserController.unbanUser);

router.post('/:userId/role', verifyToken, isAdmin, validate(userIdSchema, 'params'), validate(roleChangeSchema), AdminUserController.changeUserRole);
router.post('/:userId/downgrade-plan', verifyToken, isAdmin, validate(userIdSchema, 'params'), validate(downgradePlanSchema), AdminUserController.downgradePlan);

router.post('/:userId/send-notification', verifyToken, isAdmin, validate(userIdSchema, 'params'), validate(sendNotificationSchema), AdminUserController.sendNotificationToUser);

module.exports = router;
