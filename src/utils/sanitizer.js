// Sanitize sensitive data from responses
const sanitizeUser = (user) => {
  if (!user) return null;
  
  const sanitized = user.toObject ? user.toObject() : { ...user };
  delete sanitized.__v;
  delete sanitized.password_hash; // Phase 1 will have this
  
  return sanitized;
};

const sanitizeQuestion = (question, hideCorrectAnswer = true) => {
  if (!question) return null;
  
  const sanitized = question.toObject ? question.toObject() : { ...question };
  delete sanitized.__v;
  
  if (hideCorrectAnswer) {
    delete sanitized.correctAnswer;
    delete sanitized.approvalNotes;
    delete sanitized.approvedBy;
  }
  
  return sanitized;
};

const sanitizeMaterial = (material) => {
  if (!material) return null;
  
  const sanitized = material.toObject ? material.toObject() : { ...material };
  delete sanitized.__v;
  delete sanitized.content; // Don't send full content unless needed
  
  return sanitized;
};

const sanitizeArray = (items, sanitizer) => {
  return items.map(item => sanitizer(item));
};

module.exports = {
  sanitizeUser,
  sanitizeQuestion,
  sanitizeMaterial,
  sanitizeArray,
};
