require('dotenv').config();

const env = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI,
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  UNIVERSITY_ID: process.env.UNIVERSITY_ID || 'unizik',
  JWT_SECRET: process.env.JWT_SECRET,
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@universitycbt.com',
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@universitycbt.com',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
};

const validateEnv = () => {
  const requiredVars = ['MONGO_URI', 'GEMINI_API_KEY', 'JWT_SECRET'];
  const missing = requiredVars.filter((variable) => !env[variable]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

module.exports = { env, validateEnv };
