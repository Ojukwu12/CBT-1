const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth.middleware');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');

const logger = new Logger('AuthController');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, universityId } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ApiError(409, 'Email already registered'));
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = new User({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    universityId,
    role: 'student',
    plan: 'free',
    isActive: true,
  });

  await user.save();

  // Generate token
  const token = generateToken({
    id: user._id,
    email: user.email,
    role: user.role,
    plan: user.plan,
  });

  logger.info(`User registered: ${email}`);

  res.status(201).json(
    new ApiResponse(201, {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        plan: user.plan,
      },
      token,
      expiresIn: '7 days',
    }, 'User registered successfully')
  );
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError(401, 'Invalid email or password'));
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return next(new ApiError(401, 'Invalid email or password'));
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new ApiError(403, 'Account is deactivated'));
  }

  // Check if plan is expired
  if (user.plan !== 'free' && user.planExpiresAt && new Date() > user.planExpiresAt) {
    user.plan = 'free';
    user.planExpiresAt = null;
    await user.save();
  }

  // Generate token
  const token = generateToken({
    id: user._id,
    email: user.email,
    role: user.role,
    plan: user.plan,
  });

  logger.info(`User logged in: ${email}`);

  res.status(200).json(
    new ApiResponse(200, {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
      },
      token,
      expiresIn: '7 days',
    }, 'Login successful')
  );
});

/**
 * Get current user (requires auth)
 * GET /api/auth/me
 */
const getCurrentUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('-password');
  
  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  res.status(200).json(
    new ApiResponse(200, user, 'User retrieved successfully')
  );
});

module.exports = {
  register,
  login,
  getCurrentUser,
};
