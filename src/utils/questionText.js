const ANSWER_LINE_REGEX = /^\s*(?:answer|ans|correct(?:\s+answer)?|correct\s+option)\s*[:\-]?\s*[A-D]\b.*$/i;
const OPTION_LINE_REGEX = /^\s*[A-D]\s*[\).:-]\s+.+$/i;

const sanitizeQuestionText = (value = '') => {
  const normalized = String(value || '').replace(/\r\n?/g, '\n');

  const cleanedLines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !ANSWER_LINE_REGEX.test(line))
    .filter((line) => !OPTION_LINE_REGEX.test(line));

  const lineCombined = cleanedLines.join(' ').replace(/\s+/g, ' ').trim();

  return lineCombined
    .replace(/\s*(?:answer|ans|correct(?:\s+answer)?|correct\s+option)\s*[:\-]?\s*[A-D]\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

module.exports = {
  sanitizeQuestionText,
};