const { env } = require('../config/env');
const { generateQuestionsWithGemini } = require('./gemini');
const { generateQuestionsWithOpenAI } = require('./openai');

const PROVIDERS = {
  gemini: generateQuestionsWithGemini,
  openai: generateQuestionsWithOpenAI,
};

const normalizeProvider = (provider) => (provider || '').trim().toLowerCase();

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(timeoutMessage);
      error.statusCode = 504;
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const generateQuestions = async (
  materialContent,
  courseCode,
  topicName,
  difficulty = 'mixed',
  options = {}
) => {
  const providers = [env.AI_PROVIDER, env.AI_FALLBACK_PROVIDER]
    .map(normalizeProvider)
    .filter(Boolean);

  const uniqueProviders = Array.from(new Set(providers));
  const providerTimeoutMs = parseInt(process.env.AI_PROVIDER_TIMEOUT_MS || '40000', 10);

  if (uniqueProviders.length === 0) {
    throw new Error('No AI provider configured');
  }

  let lastError = null;
  for (const provider of uniqueProviders) {
    const handler = PROVIDERS[provider];
    if (!handler) {
      continue;
    }

    if (provider === 'gemini' && !env.GEMINI_API_KEY) {
      continue;
    }

    if (provider === 'openai' && !env.OPENAI_API_KEY) {
      continue;
    }

    try {
      console.log(`[AI Generation] Attempting provider: ${provider} (timeout: ${providerTimeoutMs}ms)`);
      const result = await withTimeout(
        handler(materialContent, courseCode, topicName, difficulty, options),
        providerTimeoutMs,
        `${provider} provider timed out`
      );
      console.log(`[AI Generation] Success with provider: ${provider}`);
      return result;
    } catch (err) {
      console.error(`[AI Generation] Failed with provider ${provider}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Question generation failed');
};

module.exports = {
  generateQuestions,
};
