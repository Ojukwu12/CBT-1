const { normalizeText } = require('./fileExtraction');
const { sanitizeQuestionText } = require('./questionText');

const QUESTION_START_REGEX = /^\s*(?:Q(?:uestion)?\s*)?(\d{1,3})\s*[\).:-]?\s+(.+)$/i;
const OPTION_REGEX = /^\s*(?:[\[\(]?\s*[✓✔☑✅]?\s*[\]\)]?\s*)?\(?([A-Da-d])\)?\s*[\).:-]\s*(.+)$/;
const ANSWER_REGEX = /\b(?:right(?:\s+answer|\s+option)?|answer|ans|correct(?:\s+answer)?|correct\s+option|correct)\b\s*(?:is\s*)?[:\-]?\s*(?:[✓✔☑✅]\s*)?([A-D])\b/i;
const HEADER_LINE_REGEXES = [
  /^\s*(department|faculty|course|course\s*code|code|exam|semester|session|level|time\s*(allowed|limit|taken)?|duration|instructions?)\b\s*[:\-]?/i,
  /^\s*(answer\s+all\s+questions|attempt\s+all\s+questions|choose\s+any\s+\d+|all\s+questions\s+carry)/i,
  /^\s*(name|matric\s*(no|number)|registration\s*(no|number)|date)\b\s*[:\-]?/i,
];

const TICK_MARK_REGEX = /[✓✔☑✅]/;
const TICKED_OPTION_LETTER_REGEX = /(?:[✓✔☑✅]\s*\(?([A-Da-d])\)?|\(?([A-Da-d])\)?\s*[\).:-]?\s*[✓✔☑✅])/;

const normalizeAnswerLetter = (value = '') => {
  const normalized = String(value).trim().toUpperCase();
  const letterOnlyMatch = normalized.match(/^([A-D])$/);
  if (letterOnlyMatch) {
    return letterOnlyMatch[1];
  }

  const decoratedLetterMatch = normalized.match(/\b(?:OPTION\s*)?([A-D])\b/);
  if (decoratedLetterMatch) {
    return decoratedLetterMatch[1];
  }

  return null;
};

const isHeadingOrMetadataLine = (line = '') => {
  const trimmed = String(line).trim();
  if (!trimmed) {
    return true;
  }

  if (HEADER_LINE_REGEXES.some((regex) => regex.test(trimmed))) {
    return true;
  }

  if (/^[A-Z\s\-(),.]{6,}$/.test(trimmed) && !/[?.!]/.test(trimmed)) {
    return true;
  }

  return false;
};

const splitIntoBlocks = (text) => {
  const lines = normalizeText(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

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
  let hasQuestionStem = false;
  const tickedOptions = [];

  const answerMatch = block.match(ANSWER_REGEX);
  if (answerMatch) {
    correctAnswer = normalizeAnswerLetter(answerMatch[1]);
  }

  const textLines = [];
  for (const line of lines) {
    if (ANSWER_REGEX.test(line)) {
      continue;
    }

    const questionMatch = line.match(QUESTION_START_REGEX);
    if (questionMatch) {
      hasQuestionStem = true;
      textLines.push(questionMatch[2].trim());
      continue;
    }

    const optionMatch = line.match(OPTION_REGEX);
    if (optionMatch) {
      const optionKey = optionMatch[1].toUpperCase();
      const optionValue = optionMatch[2].trim();
      options[optionKey] = optionValue;

      const tickedLetterMatch = line.match(TICKED_OPTION_LETTER_REGEX);
      if (tickedLetterMatch?.[1] || tickedLetterMatch?.[2]) {
        tickedOptions.push((tickedLetterMatch[1] || tickedLetterMatch[2]).toUpperCase());
      } else if (TICK_MARK_REGEX.test(line) || TICK_MARK_REGEX.test(optionValue)) {
        tickedOptions.push(optionKey);
      }
      continue;
    }

    if (!hasQuestionStem && isHeadingOrMetadataLine(line)) {
      continue;
    }

    textLines.push(line);
  }

  if (!hasQuestionStem) {
    return null;
  }

  questionText = sanitizeQuestionText(textLines.join(' '));

  if (!questionText) {
    return null;
  }

  if (!correctAnswer) {
    const uniqueTickedOptions = Array.from(new Set(tickedOptions));
    if (uniqueTickedOptions.length === 1) {
      correctAnswer = uniqueTickedOptions[0];
    }
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
