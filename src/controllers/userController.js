const bcrypt = require('bcryptjs');
const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { createUserSchema, upgradePlanSchema, downgradePlanSchema } = require('../validators/user.validator');

const createUser = [
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { email, firstName, lastName, universityId, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userService.createUser({
      email,
      firstName,
      lastName,
      universityId,
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
  getUser,
  getUserByEmail,
  listUsersByUniversity,
  upgradePlan,
  downgradePlan,
};
