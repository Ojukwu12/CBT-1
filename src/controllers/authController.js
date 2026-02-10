const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateToken } = require('../middleware/auth.middleware');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/apiResponse');
const Logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const emailService = require('../services/emailService');
const { env } = require('../config/env');

const logger = new Logger('AuthController');

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');

const generateRefreshToken = (payload, expiresIn = '30d') => {
  return require('jsonwebtoken').sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn });
};

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

  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyTokenExpiresAt = new Date(Date.now() + (env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES || 60) * 60 * 1000);

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
    emailVerificationTokenHash: hashValue(verifyToken),
    emailVerificationTokenExpiresAt: verifyTokenExpiresAt,
  });

  await user.save();

  const verifyLink = `${env.BASE_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;

  // Send verification email
  try {
    await emailService.sendEmailVerificationLink(user, {
      verifyLink,
      expiresInMinutes: env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES || 60,
    });
  } catch (err) {
    logger.error('Verification email failed:', err);
  }

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(user);
  } catch (err) {
    logger.error('Welcome email failed:', err);
    // Don't fail registration if email fails
  }

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
        emailVerifiedAt: user.emailVerifiedAt,
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

  // Find user and explicitly select password
  const user = await User.findOne({ email }).select('+password +refreshTokenHash');
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

  const refreshToken = generateRefreshToken({
    id: user._id,
    email: user.email,
    role: user.role,
  });

  user.refreshTokenHash = hashValue(refreshToken);
  await user.save();

  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

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
        emailVerifiedAt: user.emailVerifiedAt,
      },
      token,
      expiresIn: '7 days',
    }, 'Login successful')
  );
});

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();

  user.passwordResetTokenHash = hashValue(resetToken);
  user.passwordResetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  user.passwordResetOtpHash = hashValue(resetOtp);
  user.passwordResetOtpExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await user.save();

  const resetLink = `${env.BASE_URL || 'http://localhost:3000'}/api/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  await emailService.sendPasswordResetOptionsEmail(user, {
    otp: resetOtp,
    resetLink,
    expiresInMinutes: 60,
  });

  res.status(200).json(
    new ApiResponse(200, null, 'Password reset email sent')
  );
});

/**
 * Reset password (token or OTP)
 * POST /api/auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, token, otp, newPassword } = req.body;

  const user = await User.findOne({ email }).select('+passwordResetTokenHash +passwordResetOtpHash');
  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  const now = Date.now();
  let valid = false;

  if (token && user.passwordResetTokenHash && user.passwordResetTokenExpiresAt && user.passwordResetTokenExpiresAt.getTime() > now) {
    valid = hashValue(token) === user.passwordResetTokenHash;
  }

  if (!valid && otp && user.passwordResetOtpHash && user.passwordResetOtpExpiresAt && user.passwordResetOtpExpiresAt.getTime() > now) {
    valid = hashValue(otp) === user.passwordResetOtpHash;
  }

  if (!valid) {
    return next(new ApiError(400, 'Invalid or expired reset token/OTP'));
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpiresAt = undefined;
  user.passwordResetOtpHash = undefined;
  user.passwordResetOtpExpiresAt = undefined;
  user.refreshTokenHash = undefined;

  await user.save();

  res.status(200).json(
    new ApiResponse(200, null, 'Password reset successful')
  );
});

/**
 * Verify reset token (magic link)
 * GET /api/auth/reset-password?email=...&token=...
 */
const verifyResetToken = asyncHandler(async (req, res, next) => {
  const { email, token } = req.query;

  const user = await User.findOne({ email }).select('+passwordResetTokenHash');
  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  const now = Date.now();
  if (!user.passwordResetTokenHash || !user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt.getTime() <= now) {
    return next(new ApiError(400, 'Reset token expired'));
  }

  if (hashValue(token) !== user.passwordResetTokenHash) {
    return next(new ApiError(400, 'Invalid reset token'));
  }

  res.status(200).json(
    new ApiResponse(200, { email, token }, 'Reset token valid')
  );
});

/**
 * Verify email (magic link)
 * GET /api/auth/verify-email?email=...&token=...
 */
const verifyEmail = asyncHandler(async (req, res, next) => {
  const { email, token } = req.query;

  const user = await User.findOne({ email }).select('+emailVerificationTokenHash');
  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  if (user.emailVerifiedAt) {
    return res.status(200).json(
      new ApiResponse(200, { email }, 'Email already verified')
    );
  }

  const now = Date.now();
  if (!user.emailVerificationTokenHash || !user.emailVerificationTokenExpiresAt || user.emailVerificationTokenExpiresAt.getTime() <= now) {
    return next(new ApiError(400, 'Verification link expired'));
  }

  if (hashValue(token) !== user.emailVerificationTokenHash) {
    return next(new ApiError(400, 'Invalid verification token'));
  }

  user.emailVerifiedAt = new Date();
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationTokenExpiresAt = undefined;
  await user.save();

  res.status(200).json(
    new ApiResponse(200, { email }, 'Email verified successfully')
  );
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refreshToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return next(new ApiError(401, 'Refresh token missing'));
  }

  let decoded;
  try {
    decoded = require('jsonwebtoken').verify(token, env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return next(new ApiError(401, 'Invalid refresh token'));
  }

  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    return next(new ApiError(401, 'Refresh token invalid'));
  }

  if (hashValue(token) !== user.refreshTokenHash) {
    return next(new ApiError(401, 'Refresh token invalid'));
  }

  const newAccessToken = generateToken({
    id: user._id,
    email: user.email,
    role: user.role,
    plan: user.plan,
  });

  const newRefreshToken = generateRefreshToken({
    id: user._id,
    email: user.email,
    role: user.role,
  });

  user.refreshTokenHash = hashValue(newRefreshToken);
  await user.save();

  res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions());

  res.status(200).json(
    new ApiResponse(200, { token: newAccessToken, expiresIn: '7 days' }, 'Token refreshed')
  );
});

/**
 * Logout
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = require('jsonwebtoken').verify(token, env.REFRESH_TOKEN_SECRET);
      const user = await User.findById(decoded.id).select('+refreshTokenHash');
      if (user) {
        user.refreshTokenHash = undefined;
        await user.save();
      }
    } catch (err) {
      // ignore invalid refresh token on logout
    }
  }

  res.clearCookie('refreshToken', getRefreshCookieOptions());
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
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
  forgotPassword,
  resetPassword,
  verifyResetToken,
  verifyEmail,
  refreshToken,
  logout,
};
