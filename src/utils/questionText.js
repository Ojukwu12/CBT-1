const ANSWER_MARKER_REGEX = '(?:right(?:\\s+answer|\\s+option)?|answer|ans|correct(?:\\s+answer)?|correct\\s+option)';
const ANSWER_LINE_REGEX = new RegExp(`^\\s*${ANSWER_MARKER_REGEX}\\s*[:\\-]?\\s*[A-D]\\b.*$`, 'i');
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
    .replace(new RegExp(`\\s*${ANSWER_MARKER_REGEX}\\s*[:\\-]?\\s*[A-D]\\b.*$`, 'i'), '')
    .replace(/\s+/g, ' ')
    .trim();
};

module.exports = {
  sanitizeQuestionText,
};