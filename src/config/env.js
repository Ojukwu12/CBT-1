require('dotenv').config();

const env = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI,
  NODE_ENV: process.env.NODE_ENV || (process.env.RENDER ? 'production' : 'development'),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  GEMINI_API_VERSION: process.env.GEMINI_API_VERSION || 'v1beta',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  AI_PROVIDER: process.env.AI_PROVIDER || 'gemini',
  AI_FALLBACK_PROVIDER: process.env.AI_FALLBACK_PROVIDER || 'openai',
  AI_ENABLED: process.env.AI_ENABLED !== 'false',
  AI_DAILY_LIMIT: parseInt(process.env.AI_DAILY_LIMIT || '50', 10),
  AI_CACHE_HOURS: parseInt(process.env.AI_CACHE_HOURS || '24', 10),
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: parseInt(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES || '60', 10),
  EXAM_RESULT_DELAY_MINUTES: parseInt(process.env.EXAM_RESULT_DELAY_MINUTES || '0', 10),
  UNIVERSITY_ID: process.env.UNIVERSITY_ID || 'unizik',
  JWT_SECRET: process.env.JWT_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
  JWT_ACCESS_TOKEN_TTL: process.env.JWT_ACCESS_TOKEN_TTL || '15m',
  JWT_REFRESH_TOKEN_TTL: process.env.JWT_REFRESH_TOKEN_TTL || '30d',
  REFRESH_TOKEN_ROTATION_GRACE_SECONDS: parseInt(process.env.REFRESH_TOKEN_ROTATION_GRACE_SECONDS || '10', 10),
  ROTATE_REFRESH_TOKENS: process.env.ROTATE_REFRESH_TOKENS !== 'false',
  REFRESH_TOKEN_COOKIE_DOMAIN: process.env.REFRESH_TOKEN_COOKIE_DOMAIN,
  REFRESH_TOKEN_COOKIE_PATH: process.env.REFRESH_TOKEN_COOKIE_PATH || '/',
  REFRESH_TOKEN_COOKIE_SAME_SITE: process.env.REFRESH_TOKEN_COOKIE_SAME_SITE,
  REFRESH_TOKEN_COOKIE_SECURE: process.env.REFRESH_TOKEN_COOKIE_SECURE === undefined
    ? null
    : process.env.REFRESH_TOKEN_COOKIE_SECURE === 'true',
  JWT_ISSUER: process.env.JWT_ISSUER || 'cbt-backend',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'cbt-client',
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY,
  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_USERNAME: process.env.REDIS_USERNAME || 'default',
  REDIS_USE_TLS: process.env.REDIS_USE_TLS === 'true',
  REDIS_RETRY_BACKOFF_MS: parseInt(process.env.REDIS_RETRY_BACKOFF_MS || '60000', 10),
  CACHE_DEFAULT_TTL_SECONDS: parseInt(process.env.CACHE_DEFAULT_TTL_SECONDS || '120', 10),
  CACHE_METRICS_ENABLED: process.env.CACHE_METRICS_ENABLED === 'true',
  CACHE_METRICS_LOG_EVERY: parseInt(process.env.CACHE_METRICS_LOG_EVERY || '500', 10),
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@universitycbt.com',
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@universitycbt.com',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000',
};

const validateEnv = () => {
  const requiredVars = ['MONGO_URI', 'JWT_SECRET'];
  if (env.AI_ENABLED) {
    const providers = [env.AI_PROVIDER, env.AI_FALLBACK_PROVIDER]
      .map((value) => (value || '').toLowerCase())
      .filter(Boolean);

    if (providers.includes('gemini')) {
      requiredVars.push('GEMINI_API_KEY');
    }
    if (providers.includes('openai')) {
      requiredVars.push('OPENAI_API_KEY');
    }
  }
  const missing = requiredVars.filter((variable) => !env[variable]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

module.exports = { env, validateEnv };
