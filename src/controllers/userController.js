const bcrypt = require('bcryptjs');
const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const ApiError = require('../utils/ApiError');
const { createUserSchema, changePlanSchema, upgradePlanSchema, downgradePlanSchema } = require('../validators/user.validator');

const createUser = [
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { email, firstName, lastName, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userService.createUser({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      plan: 'free',
      role: 'student',
    });

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully',
    });
  })
];

const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  res.status(200).json({
    success: true,
    data: user,
  });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.status(200).json({
    success: true,
    data: user,
  });
});

const getUserByEmail = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const user = await userService.getUserByEmail(email);
  res.status(200).json({
    success: true,
    data: user,
  });
});

const listUsersByUniversity = asyncHandler(async (req, res) => {
  const { universityId } = req.params;
  const { plan } = req.query;

  const filters = { isActive: true };
  if (plan) filters.plan = plan;

  const users = await userService.getUsersByUniversity(universityId, filters);
  res.status(200).json({
    success: true,
    data: users,
    count: users.length,
  });
});

// Unified endpoint: accepts any plan and intelligently upgrades/downgrades
const changePlan = [
  validate(changePlanSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { plan: newPlan, expiryDays = 30 } = req.body;

    // Get current user to check their existing plan
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const currentPlan = user.plan || 'free';
    const planHierarchy = { 'free': 0, 'basic': 1, 'premium': 2 };
    const isUpgrade = planHierarchy[newPlan] > planHierarchy[currentPlan];
    const isDowngrade = planHierarchy[newPlan] < planHierarchy[currentPlan];

    let updatedUser;
    if (isUpgrade) {
      updatedUser = await userService.upgradePlan(userId, newPlan, expiryDays);
    } else if (isDowngrade) {
      updatedUser = await userService.downgradePlan(userId, newPlan);
    } else {
      // Plan is the same, just return user
      updatedUser = user;
    }

    const action = isUpgrade ? 'upgraded to' : isDowngrade ? 'downgraded to' : 'plan changed to';
    res.status(200).json({
      success: true,
      data: updatedUser,
      message: `User ${action} ${newPlan} plan`,
    });
  })
];

const upgradePlan = [
  validate(upgradePlanSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { newPlan, expiryDays = 30 } = req.body;

    const user = await userService.upgradePlan(userId, newPlan, expiryDays);
    res.status(200).json({
      success: true,
      data: user,
      message: `User upgraded to ${newPlan} plan`,
    });
  })
];

const downgradePlan = [
  validate(downgradePlanSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { newPlan = 'free' } = req.body;

    const user = await userService.downgradePlan(userId, newPlan);
    res.status(200).json({
      success: true,
      data: user,
      message: `User downgraded to ${newPlan} plan`,
    });
  })
];

module.exports = {
  createUser,
  getMe,
  getUser,
  getUserByEmail,
  listUsersByUniversity,
  changePlan,
  upgradePlan,
  downgradePlan,
};
