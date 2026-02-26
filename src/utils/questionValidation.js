const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D']);

const normalizeDifficulty = (value = '') => {
  const normalized = String(value).trim().toLowerCase();
  return VALID_DIFFICULTIES.has(normalized) ? normalized : null;
};

const normalizeAnswerLetter = (value = '') => {
  const normalized = String(value).trim().toUpperCase();
  const directMatch = normalized.match(/^([A-D])$/);
  if (directMatch) {
    return directMatch[1];
  }

  const decoratedMatch = normalized.match(/\b(?:OPTION\s*)?([A-D])\b/);
  if (decoratedMatch) {
    return decoratedMatch[1];
  }

  return null;
};

const inferAnswerFromOptionText = (rawAnswer, options = {}) => {
  const answerText = String(rawAnswer || '').trim().toLowerCase();
  if (!answerText) {
    return null;
  }

  for (const key of ['A', 'B', 'C', 'D']) {
    const optionText = String(options?.[key] || '').trim().toLowerCase();
    if (optionText && optionText === answerText) {
      return key;
    }
  }

  return null;
};

const validateQuestions = (questions, expectedCount = 20) => {
  if (!Array.isArray(questions) || questions.length !== expectedCount) {
    throw new Error(`AI must return exactly ${expectedCount} questions`);
  }

  questions.forEach((q, index) => {
    if (!q || typeof q.text !== 'string' || q.text.trim().length === 0) {
      throw new Error(`Question ${index + 1} is missing text`);
    }

    const options = q.options || {};
    const optionKeys = Object.keys(options);
    if (optionKeys.length !== 4 || !optionKeys.every((key) => VALID_OPTIONS.has(key))) {
      throw new Error(`Question ${index + 1} must include options A, B, C, D`);
    }

    const normalizedCorrectAnswer =
      normalizeAnswerLetter(q.correctAnswer) ||
      normalizeAnswerLetter(q.answer) ||
      inferAnswerFromOptionText(q.correctAnswer, options) ||
      inferAnswerFromOptionText(q.answer, options);

    if (!VALID_OPTIONS.has(normalizedCorrectAnswer)) {
      throw new Error(`Question ${index + 1} has invalid correctAnswer`);
    }

    q.correctAnswer = normalizedCorrectAnswer;

    const normalizedDifficulty = normalizeDifficulty(q.difficulty);
    if (!normalizedDifficulty) {
      throw new Error(`Question ${index + 1} has invalid difficulty`);
    }

    q.difficulty = normalizedDifficulty;
  });
};

module.exports = {
  VALID_DIFFICULTIES,
  VALID_OPTIONS,
  validateQuestions,
};
