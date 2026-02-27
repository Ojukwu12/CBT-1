const Joi = require('joi');

const registerSchema = Joi.object({
  firstName: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(50)
    .messages({
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
    }),
  lastName: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(50)
    .messages({
      'string.empty': 'Last name is required',
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters',
    }),
  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Must be a valid email address',
      'string.empty': 'Email is required',
    }),
  password: Joi.string()
    .required()
    .min(6)
    .max(128)
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password cannot exceed 128 characters',
    }),
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Must be a valid email address',
      'string.empty': 'Email is required',
    }),
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
    }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Must be a valid email address',
      'string.empty': 'Email is required',
    }),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Must be a valid email address',
      'string.empty': 'Email is required',
    }),
  token: Joi.string().optional(),
  otp: Joi.string().optional(),
  newPassword: Joi.string()
    .required()
    .min(6)
    .max(128)
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 6 characters',
      'string.max': 'New password cannot exceed 128 characters',
    }),
}).custom((value, helpers) => {
  if (!value.token && !value.otp) {
    return helpers.error('any.custom', { message: 'Provide token or otp' });
  }
  return value;
});

const resetPasswordTokenQuerySchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Must be a valid email address',
      'string.empty': 'Email is required',
    }),
  token: Joi.string().required(),
});

const emailValidator = Joi.string().email();

const normalizeQueryValue = (value) => {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return normalized;
  }

  try {
    return decodeURIComponent(normalized);
  } catch (error) {
    return normalized;
  }
};

const isValidEmail = (value) => emailValidator.validate(value).error === undefined;

const verifyEmailQuerySchema = Joi.object({
  email: Joi.string()
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.empty': 'Email is required',
    }),
  token: Joi.string().required().trim(),
}).custom((value, helpers) => {
  const emailParam = normalizeQueryValue(value.email);
  const tokenParam = normalizeQueryValue(value.token);

  const emailInEmailParam = isValidEmail(String(emailParam).toLowerCase());
  const emailInTokenParam = isValidEmail(String(tokenParam).toLowerCase());

  if (!emailInEmailParam && !emailInTokenParam) {
    return helpers.error('any.custom', { message: 'Must include a valid email in query params' });
  }

  if (emailInEmailParam && emailInTokenParam) {
    return helpers.error('any.custom', { message: 'Verification token is invalid or missing' });
  }

  const normalizedEmail = (emailInEmailParam ? emailParam : tokenParam).toLowerCase().trim();
  const normalizedToken = (emailInEmailParam ? tokenParam : emailParam).trim();

  if (!normalizedToken) {
    return helpers.error('any.custom', { message: 'Verification token is required' });
  }

  return {
    ...value,
    email: normalizedEmail,
    token: normalizedToken,
  };
});

const resendVerificationEmailSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Must be a valid email address',
      'string.empty': 'Email is required',
    }),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().trim().optional(),
});

const logoutSchema = Joi.object({});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetPasswordTokenQuerySchema,
  verifyEmailQuerySchema,
  resendVerificationEmailSchema,
  refreshTokenSchema,
  logoutSchema,
};
