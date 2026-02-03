// Plan limits for Phase 0
const PLAN_LIMITS = {
  free: {
    questionsPerTopicPerDay: 8,
    maxTopics: 5,
    maxRequests: 100,
  },
  basic: {
    questionsPerTopicPerDay: 50,
    maxTopics: 20,
    maxRequests: 500,
  },
  premium: {
    questionsPerTopicPerDay: -1, // Unlimited
    maxTopics: -1, // Unlimited
    maxRequests: -1, // Unlimited
  },
};

// Question status values
const QUESTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Question difficulty levels
const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

// Access levels for questions
const ACCESS_LEVELS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
};

// User roles
const USER_ROLES = {
  STUDENT: 'student',
  ADMIN: 'admin',
};

// User plans
const USER_PLANS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
};

// Material file types
const MATERIAL_FILE_TYPES = {
  PDF: 'pdf',
  IMAGE: 'image',
  TEXT: 'text',
};

// Material processing status
const MATERIAL_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
};

// AI Generation status
const AI_GENERATION_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
};

// Course levels
const COURSE_LEVELS = [100, 200, 300, 400, 500, 600];

// Gemini API limits (Phase 0)
const GEMINI_LIMITS = {
  maxQuestionsPerDocument: 50,
  maxRequestsPerDay: 1000,
  maxTokensPerRequest: 4000,
};

module.exports = {
  PLAN_LIMITS,
  QUESTION_STATUS,
  DIFFICULTY_LEVELS,
  ACCESS_LEVELS,
  USER_ROLES,
  USER_PLANS,
  MATERIAL_FILE_TYPES,
  MATERIAL_STATUS,
  AI_GENERATION_STATUS,
  COURSE_LEVELS,
  GEMINI_LIMITS,
};
