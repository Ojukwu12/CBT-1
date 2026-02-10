const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D']);

const validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length !== 10) {
    throw new Error('AI must return exactly 10 questions');
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

    if (!VALID_OPTIONS.has(q.correctAnswer)) {
      throw new Error(`Question ${index + 1} has invalid correctAnswer`);
    }

    if (!VALID_DIFFICULTIES.has(q.difficulty)) {
      throw new Error(`Question ${index + 1} has invalid difficulty`);
    }
  });
};

module.exports = {
  VALID_DIFFICULTIES,
  VALID_OPTIONS,
  validateQuestions,
};
