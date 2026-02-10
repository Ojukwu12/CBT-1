const { parseQuestionBank } = require('./questionBankParser');

const detectQuestionBank = (text) => {
  return parseQuestionBank(text);
};

module.exports = {
  detectQuestionBank,
};
