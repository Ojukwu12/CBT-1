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

const REFRESH_TOKEN_ROTATION_GRACE_SECONDS = Math.max(0, env.REFRESH_TOKEN_ROTATION_GRACE_SECONDS || 10);
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_TOKEN_TTL = `${REFRESH_TOKEN_TTL_SECONDS}s`;
const MAX_REFRESH_SESSIONS_PER_USER = 10;

const resolveRefreshCookieSecure = () => {
  if (typeof env.REFRESH_TOKEN_COOKIE_SECURE === 'boolean') {
    return env.REFRESH_TOKEN_COOKIE_SECURE;
  }
  return env.NODE_ENV === 'production';
};

const resolveRefreshCookieSameSite = (isSecureCookie) => {
  if (env.REFRESH_TOKEN_COOKIE_SAME_SITE) {
    return env.REFRESH_TOKEN_COOKIE_SAME_SITE;
  }
  return isSecureCookie ? 'none' : 'lax';
};

const getRefreshCookieBaseOptions = () => {
  const secure = resolveRefreshCookieSecure();
  const sameSite = resolveRefreshCookieSameSite(secure);

  const baseOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: env.REFRESH_TOKEN_COOKIE_PATH || '/',
  };

  if (env.REFRESH_TOKEN_COOKIE_DOMAIN) {
    baseOptions.domain = env.REFRESH_TOKEN_COOKIE_DOMAIN;
  }

  return baseOptions;
};

const getRefreshCookieOptions = () => ({
  ...getRefreshCookieBaseOptions(),
  maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
});

const getRefreshCookieClearOptions = () => getRefreshCookieBaseOptions();

const getRefreshTokenFromRequest = (req) => {
  if (req.cookies?.refreshToken) {
    return { token: req.cookies.refreshToken, source: 'cookie' };
  }

  if (req.cookies?.refresh_token) {
    return { token: req.cookies.refresh_token, source: 'cookie' };
  }

  const headerToken = req.headers['x-refresh-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return { token: headerToken.trim(), source: 'header' };
  }

  const bodyToken = req.body?.refreshToken;
  if (typeof bodyToken === 'string' && bodyToken.trim()) {
    return { token: bodyToken.trim(), source: 'body' };
  }

  const bodyTokenAlias = req.body?.token || req.body?.refresh_token;
  if (typeof bodyTokenAlias === 'string' && bodyTokenAlias.trim()) {
    return { token: bodyTokenAlias.trim(), source: 'body' };
  }

  const authorization = req.headers.authorization;
  if (typeof authorization === 'string') {
    const [scheme, value] = authorization.split(' ');
    if ((/^Refresh$/i.test(scheme) || /^Bearer$/i.test(scheme)) && typeof value === 'string' && value.trim()) {
      return { token: value.trim(), source: 'authorization' };
    }
  }

  return { token: null, source: null };
};

const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');

const getRefreshExpiryDate = () => new Date(Date.now() + (REFRESH_TOKEN_TTL_SECONDS * 1000));

const trimRefreshSessions = (sessions = []) => {
  return sessions
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, MAX_REFRESH_SESSIONS_PER_USER);
};

const addRefreshSession = (user, token, source = 'unknown') => {
  if (!Array.isArray(user.refreshSessions)) {
    user.refreshSessions = [];
  }

  user.refreshSessions.push({
    tokenHash: hashValue(token),
    source: source || 'unknown',
    createdAt: new Date(),
    lastUsedAt: new Date(),
    expiresAt: getRefreshExpiryDate(),
    previousTokenHash: null,
    previousTokenValidUntil: null,
    revokedAt: null,
  });

  user.refreshSessions = trimRefreshSessions(user.refreshSessions);
};

const findMatchingRefreshSession = (user, incomingTokenHash, nowMs) => {
  if (!Array.isArray(user?.refreshSessions) || user.refreshSessions.length === 0) {
    return { session: null, matchedPrevious: false };
  }

  for (const session of user.refreshSessions) {
    if (session.revokedAt) continue;
    if (session.expiresAt && new Date(session.expiresAt).getTime() <= nowMs) continue;

    if (session.tokenHash === incomingTokenHash) {
      return { session, matchedPrevious: false };
    }

    const previousStillValid = session.previousTokenHash
      && session.previousTokenValidUntil
      && new Date(session.previousTokenValidUntil).getTime() > nowMs;

    if (previousStillValid && session.previousTokenHash === incomingTokenHash) {
      return { session, matchedPrevious: true };
    }
  }

  return { session: null, matchedPrevious: false };
};

const generateRefreshToken = (payload, expiresIn = REFRESH_TOKEN_TTL) => {
  return require('jsonwebtoken').sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: 'HS256',
  });
};

const buildAuthTokenPayload = ({ accessToken, refreshToken }) => ({
  accessToken,
  refreshToken,
  expiresIn: env.JWT_ACCESS_TOKEN_TTL,
  token: accessToken,
});

const buildResendVerificationMeta = (email) => ({
  email,
  canResendVerification: true,
  resendVerificationEndpoint: '/api/auth/resend-verification-email',
});

const buildFrontendVerificationLink = (email, verifyToken) => {
  const frontendBase = env.FRONTEND_URL || 'http://localhost:5173';
  const verifyPath = env.EMAIL_VERIFICATION_FRONTEND_PATH || '/email-verified';
  const params = new URLSearchParams({
    token: verifyToken,
    email,
  });

  return `${frontendBase}${verifyPath}?${params.toString()}`;
};

const setNoStoreHeaders = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
};

const issuePasswordResetChallenge = async (user) => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();

  user.passwordResetTokenHash = hashValue(resetToken);
  user.passwordResetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  user.passwordResetOtpHash = hashValue(resetOtp);
  user.passwordResetOtpExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await user.save();

  const resetLink = `${env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(user.email)}`;

  await emailService.sendPasswordResetOptionsEmail(user, {
    otp: resetOtp,
    resetLink,
    expiresInMinutes: 60,
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

  const verifyLink = buildFrontendVerificationLink(email, verifyToken);

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
  const user = await User.findOne({ email }).select('+password +refreshTokenHash +passwordResetTokenHash +passwordResetOtpHash');
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

  // Block login until email is verified
  if (!user.emailVerifiedAt) {
    return next(new ApiError(
      403,
      'Email not verified. Please verify your email before logging in.',
      buildResendVerificationMeta(user.email)
    ));
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
  user.previousRefreshTokenHash = undefined;
  user.previousRefreshTokenValidUntil = undefined;
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpiresAt = undefined;
  user.passwordResetOtpHash = undefined;
  user.passwordResetOtpExpiresAt = undefined;
  addRefreshSession(user, refreshToken, 'cookie');
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
      ...buildAuthTokenPayload({ accessToken: token, refreshToken }),
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

  await issuePasswordResetChallenge(user);

  res.status(200).json(
    new ApiResponse(200, null, 'Password reset email sent')
  );
});

/**
 * Resend password reset options (new OTP + new link)
 * POST /api/auth/resend-reset-password
 */
const resendResetPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  await issuePasswordResetChallenge(user);

  res.status(200).json(
    new ApiResponse(200, {
      email: user.email,
      resetEmailSent: true,
      resendResetPasswordEndpoint: '/api/auth/resend-reset-password',
    }, 'Password reset options resent successfully')
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
  user.previousRefreshTokenHash = undefined;
  user.previousRefreshTokenValidUntil = undefined;
  user.refreshSessions = [];

  await user.save();

  setNoStoreHeaders(res);

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
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';

  if (!email || !token) {
    setNoStoreHeaders(res);
    return res.redirect(`${frontendUrl}/reset-password?status=error&reason=missing_params&message=Reset link is incomplete`);
  }

  const user = await User.findOne({ email }).select('+passwordResetTokenHash');
  if (!user) {
    setNoStoreHeaders(res);
    return res.redirect(`${frontendUrl}/reset-password?status=error&reason=user_not_found&message=User not found`);
  }

  const now = Date.now();
  if (!user.passwordResetTokenHash || !user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt.getTime() <= now) {
    setNoStoreHeaders(res);
    return res.redirect(`${frontendUrl}/reset-password?status=error&reason=expired&message=Reset token expired&email=${encodeURIComponent(email)}`);
  }

  if (hashValue(token) !== user.passwordResetTokenHash) {
    setNoStoreHeaders(res);
    return res.redirect(`${frontendUrl}/reset-password?status=error&reason=invalid_token&message=Invalid reset token&email=${encodeURIComponent(email)}`);
  }

  setNoStoreHeaders(res);
  return res.redirect(`${frontendUrl}/reset-password?status=success&message=Reset token valid&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
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
    return res.redirect(`${frontendUrl}/email-verified?status=error&reason=expired&message=Verification link expired. Request a new verification email.&email=${encodeURIComponent(email)}`);
  }

  if (hashValue(token) !== user.emailVerificationTokenHash) {
    return res.redirect(`${frontendUrl}/email-verified?status=error&reason=invalid_token&message=Invalid verification token. Request a new verification email.&email=${encodeURIComponent(email)}`);
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
  const { token, source } = getRefreshTokenFromRequest(req);
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

  const user = await User.findById(decoded.id).select('+refreshTokenHash +previousRefreshTokenHash +previousRefreshTokenValidUntil');
  if (!user) {
    return next(new ApiError(401, 'Refresh token invalid'));
  }

  const incomingTokenHash = hashValue(token);
  const now = Date.now();

  const { session: matchingSession, matchedPrevious: sessionMatchedPrevious } = findMatchingRefreshSession(user, incomingTokenHash, now);

  const legacyMatchesCurrent = incomingTokenHash === user.refreshTokenHash;
  const legacyMatchesPrevious = !legacyMatchesCurrent
    && Boolean(user.previousRefreshTokenHash)
    && incomingTokenHash === user.previousRefreshTokenHash
    && user.previousRefreshTokenValidUntil
    && user.previousRefreshTokenValidUntil.getTime() > now;

  const matchesCurrentToken = Boolean(matchingSession) ? !sessionMatchedPrevious : legacyMatchesCurrent;
  const matchesPreviousToken = Boolean(matchingSession) ? sessionMatchedPrevious : legacyMatchesPrevious;

  if (!matchesCurrentToken && !matchesPreviousToken) {
    logger.warn(`Refresh token hash mismatch for user ${decoded.id}`);
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

  let outgoingRefreshToken = token;
  const shouldRotateRefreshToken = env.ROTATE_REFRESH_TOKENS && source === 'cookie';

  if (shouldRotateRefreshToken && matchesCurrentToken) {
    const newRefreshToken = generateRefreshToken({
      id: user._id,
      email: user.email,
      role: user.role,
      type: 'refresh',
      jti: uuidv4(),
    });

    user.previousRefreshTokenHash = user.refreshTokenHash;
    user.previousRefreshTokenValidUntil = new Date(Date.now() + (REFRESH_TOKEN_ROTATION_GRACE_SECONDS * 1000));
    user.refreshTokenHash = hashValue(newRefreshToken);

    if (matchingSession) {
      matchingSession.previousTokenHash = matchingSession.tokenHash;
      matchingSession.previousTokenValidUntil = new Date(Date.now() + (REFRESH_TOKEN_ROTATION_GRACE_SECONDS * 1000));
      matchingSession.tokenHash = hashValue(newRefreshToken);
      matchingSession.lastUsedAt = new Date();
      matchingSession.expiresAt = getRefreshExpiryDate();
      matchingSession.source = source || matchingSession.source || 'unknown';
      user.refreshSessions = trimRefreshSessions(user.refreshSessions || []);
    }

    await user.save();

    res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions());
    outgoingRefreshToken = newRefreshToken;
  } else {
    if (matchingSession) {
      matchingSession.lastUsedAt = new Date();
      matchingSession.source = source || matchingSession.source || 'unknown';
      user.refreshSessions = trimRefreshSessions(user.refreshSessions || []);
      await user.save();
    }

    if (matchesPreviousToken) {
      logger.info(`Accepted refresh token within grace window for user ${decoded.id} without re-rotation`);
    }

    if (env.ROTATE_REFRESH_TOKENS && source !== 'cookie' && matchesCurrentToken) {
      logger.info(`Refresh token rotation skipped for ${source}-based token flow for user ${decoded.id}`);
    }
  }

  res.status(200).json(
    new ApiResponse(200, buildAuthTokenPayload({ accessToken: newAccessToken, refreshToken: outgoingRefreshToken }), 'Token refreshed')
  );
});

/**
 * Logout
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res, next) => {
  const { token } = getRefreshTokenFromRequest(req);
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
      const user = await User.findById(decoded.id).select('+refreshTokenHash +previousRefreshTokenHash +previousRefreshTokenValidUntil');
      if (user) {
        const incomingTokenHash = hashValue(token);

        if (Array.isArray(user.refreshSessions) && user.refreshSessions.length > 0) {
          for (const session of user.refreshSessions) {
            if (session.revokedAt) continue;
            const isCurrentMatch = session.tokenHash === incomingTokenHash;
            const isPreviousMatch = session.previousTokenHash === incomingTokenHash;

            if (isCurrentMatch || isPreviousMatch) {
              session.revokedAt = new Date();
              session.previousTokenHash = null;
              session.previousTokenValidUntil = null;
            }
          }
        }

        if (user.refreshTokenHash === incomingTokenHash || user.previousRefreshTokenHash === incomingTokenHash) {
          user.refreshTokenHash = undefined;
          user.previousRefreshTokenHash = undefined;
          user.previousRefreshTokenValidUntil = undefined;
        }

        await user.save();
      }
    } catch (err) {
      // ignore invalid refresh token on logout
    }
  }

  res.clearCookie('refreshToken', getRefreshCookieClearOptions());
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

  const verifyLink = buildFrontendVerificationLink(email, verifyToken);

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
    new ApiResponse(200, {
      ...buildResendVerificationMeta(email),
      verificationEmailSent: true,
    }, 'Verification email sent successfully')
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

/**
 * Get minimal profile (requires auth)
 * GET /api/auth/profile
 */
const getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('firstName lastName email');

  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  const name = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  res.status(200).json(
    new ApiResponse(200, {
      name,
      email: user.email,
    }, 'Profile retrieved successfully')
  );
});

module.exports = {
  register,
  login,
  getCurrentUser,
  getProfile,
  forgotPassword,
  resendResetPassword,
  resetPassword,
  verifyResetToken,
  verifyEmail,
  refreshToken,
  logout,
  resendVerificationEmail,
};
