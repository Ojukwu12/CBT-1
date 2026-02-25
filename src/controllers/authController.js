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
const { v4: uuidv4 } = require('uuid');

const logger = new Logger('AuthController');

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');

const generateRefreshToken = (payload, expiresIn = env.JWT_REFRESH_TOKEN_TTL || '30d') => {
  return require('jsonwebtoken').sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: 'HS256',
  });
};

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ApiError(409, 'Email already registered'));
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyTokenExpiresAt = new Date(Date.now() + (env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES || 60) * 60 * 1000);

  // Create user (no universityId - users select university when taking exams)
  const user = new User({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role: 'student',
    plan: 'free',
    isActive: true,
    emailVerificationTokenHash: hashValue(verifyToken),
    emailVerificationTokenExpiresAt: verifyTokenExpiresAt,
  });

  await user.save();

  const verifyLink = `${env.BACKEND_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;

  // Send verification email
  let emailSent = false;
  try {
    const result = await emailService.sendEmailVerificationLink(user, {
      verifyLink,
      expiresInMinutes: env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES || 60,
    });
    emailSent = result.success;
    logger.info(`Verification email sent to ${email}: ${emailSent}`);
  } catch (err) {
    logger.error('Verification email failed:', err);
    logger.error('Error details:', { message: err.message, stack: err.stack });
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
    type: 'access',
    jti: uuidv4(),
  });

  logger.info(`User registered: ${email} - Verification email sent: ${emailSent}`);

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
      expiresIn: env.JWT_ACCESS_TOKEN_TTL,
      verificationEmailSent: emailSent,
    }, emailSent ? 'User registered successfully. Verification email sent.' : 'User registered successfully. Please check spam folder or resend verification email.')
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
    type: 'access',
    jti: uuidv4(),
  });

  const refreshToken = generateRefreshToken({
    id: user._id,
    email: user.email,
    role: user.role,
    type: 'refresh',
    jti: uuidv4(),
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
      expiresIn: env.JWT_ACCESS_TOKEN_TTL,
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

  const resetLink = `${env.BACKEND_URL || 'http://localhost:3000'}/api/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

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
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';

  const user = await User.findOne({ email }).select('+emailVerificationTokenHash');
  if (!user) {
    return res.redirect(`${frontendUrl}/email-verified?status=error&message=User not found`);
  }

  if (user.emailVerifiedAt) {
    return res.redirect(`${frontendUrl}/email-verified?status=success&message=Email already verified`);
  }

  const now = Date.now();
  if (!user.emailVerificationTokenHash || !user.emailVerificationTokenExpiresAt || user.emailVerificationTokenExpiresAt.getTime() <= now) {
    return res.redirect(`${frontendUrl}/email-verified?status=error&message=Verification link expired`);
  }

  if (hashValue(token) !== user.emailVerificationTokenHash) {
    return res.redirect(`${frontendUrl}/email-verified?status=error&message=Invalid verification token`);
  }

  user.emailVerifiedAt = new Date();
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationTokenExpiresAt = undefined;
  await user.save();

  logger.info(`Email verified successfully for user: ${email}`);
  res.redirect(`${frontendUrl}/email-verified?status=success&message=Email verified successfully`);
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
    decoded = require('jsonwebtoken').verify(token, env.REFRESH_TOKEN_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
  } catch (err) {
    return next(new ApiError(401, 'Invalid refresh token'));
  }

  if (decoded.type !== 'refresh') {
    return next(new ApiError(401, 'Invalid refresh token type'));
  }

  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    return next(new ApiError(401, 'Refresh token invalid'));
  }

  if (hashValue(token) !== user.refreshTokenHash) {
    user.refreshTokenHash = undefined;
    await user.save();
    return next(new ApiError(401, 'Refresh token invalid'));
  }

  const newAccessToken = generateToken({
    id: user._id,
    email: user.email,
    role: user.role,
    plan: user.plan,
    type: 'access',
    jti: uuidv4(),
  });

  const newRefreshToken = generateRefreshToken({
    id: user._id,
    email: user.email,
    role: user.role,
    type: 'refresh',
    jti: uuidv4(),
  });

  user.refreshTokenHash = hashValue(newRefreshToken);
  await user.save();

  res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions());

  res.status(200).json(
    new ApiResponse(200, { token: newAccessToken, expiresIn: env.JWT_ACCESS_TOKEN_TTL }, 'Token refreshed')
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
      const decoded = require('jsonwebtoken').verify(token, env.REFRESH_TOKEN_SECRET, {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        algorithms: ['HS256'],
      });
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
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
 * Resend email verification link
 * POST /api/auth/resend-verification-email
 */
const resendVerificationEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  if (user.emailVerifiedAt) {
    return res.status(400).json(
      new ApiResponse(400, null, 'Email already verified')
    );
  }

  // Generate new verification token
  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyTokenExpiresAt = new Date(Date.now() + (env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES || 60) * 60 * 1000);

  user.emailVerificationTokenHash = hashValue(verifyToken);
  user.emailVerificationTokenExpiresAt = verifyTokenExpiresAt;
  await user.save();

  const verifyLink = `${env.BACKEND_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;

  // Send verification email
  try {
    const result = await emailService.sendEmailVerificationLink(user, {
      verifyLink,
      expiresInMinutes: env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES || 60,
    });
    logger.info(`Verification email resent to ${email}: ${result.success}`);
    if (result.isDev) {
      logger.warn('Running in DEV MODE - email not actually sent via Brevo');
    }
  } catch (err) {
    logger.error('Failed to resend verification email:', err);
    logger.error('Error details:', { message: err.message, stack: err.stack });
    return next(new ApiError(500, 'Failed to send verification email'));
  }

  res.status(200).json(
    new ApiResponse(200, null, 'Verification email sent successfully')
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
  forgotPassword,
  resetPassword,
  verifyResetToken,
  verifyEmail,
  refreshToken,
  logout,
  resendVerificationEmail,
};
