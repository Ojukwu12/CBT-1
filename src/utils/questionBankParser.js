const { normalizeText } = require('./fileExtraction');

const QUESTION_START_REGEX = /^\s*(?:Q\s*\d+|Question\s*\d+|\d+)\s*[\).:-]\s*(.+)$/i;
const OPTION_REGEX = /^\s*([A-D])\s*[\).:-]\s*(.+)$/i;
const ANSWER_REGEX = /\b(?:answer|ans|correct)\b\s*[:\-]?\s*([A-D])\b/i;

const splitIntoBlocks = (text) => {
  const lines = normalizeText(text).split(/\n+/);
  const blocks = [];
  let current = [];

  const pushCurrent = () => {
    if (current.length > 0) {
      blocks.push(current.join('\n'));
      current = [];
    }
  };

  lines.forEach((line) => {
    if (QUESTION_START_REGEX.test(line)) {
      pushCurrent();
    }
    current.push(line);
  });

  pushCurrent();
  return blocks;
};

const parseBlock = (block) => {
  const lines = block.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let questionText = '';
  const options = {};
  let correctAnswer = null;

  const answerMatch = block.match(ANSWER_REGEX);
  if (answerMatch) {
    correctAnswer = answerMatch[1].toUpperCase();
  }

  const textLines = [];
  for (const line of lines) {
    const questionMatch = line.match(QUESTION_START_REGEX);
    if (questionMatch) {
      textLines.push(questionMatch[1].trim());
      continue;
    }

    const optionMatch = line.match(OPTION_REGEX);
    if (optionMatch) {
      options[optionMatch[1].toUpperCase()] = optionMatch[2].trim();
      continue;
    }

    textLines.push(line);
  }

  questionText = textLines.join(' ').replace(/\s+/g, ' ').trim();

  if (!questionText) {
    return null;
  }

  return {
    text: questionText,
    options,
    correctAnswer,
  };
};

const parseQuestionBank = (rawText) => {
  const blocks = splitIntoBlocks(rawText);
  const questions = blocks.map(parseBlock).filter(Boolean);
  const filtered = questions.filter((q) => Object.keys(q.options || {}).length >= 4);

  const normalized = filtered.map((q) => ({
    text: q.text,
    options: {
      A: q.options.A || '',
      B: q.options.B || '',
      C: q.options.C || '',
      D: q.options.D || '',
    },
    correctAnswer: q.correctAnswer || null,
  }));

  const missingAnswers = normalized.filter((q) => !q.correctAnswer).length;

  return {
    isQuestionBank: normalized.length >= 2,
    questions: normalized,
    missingAnswers,
  };
};

module.exports = {
  parseQuestionBank,
};
