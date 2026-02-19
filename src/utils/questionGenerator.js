const { env } = require('../config/env');
const { generateQuestionsWithGemini } = require('./gemini');
const { generateQuestionsWithOpenAI } = require('./openai');

const PROVIDERS = {
  gemini: generateQuestionsWithGemini,
  openai: generateQuestionsWithOpenAI,
};

const normalizeProvider = (provider) => (provider || '').trim().toLowerCase();

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
      return await handler(materialContent, courseCode, topicName, difficulty, options);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Question generation failed');
};

module.exports = {
  generateQuestions,
};
