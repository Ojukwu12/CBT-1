const mongoose = require('mongoose');

const examSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  examType: {
    type: String,
    enum: ['practice', 'mock', 'final'],
    default: 'practice',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false
  },
  topicIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  }],
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'graded'],
    default: 'in_progress',
    required: true,
    index: true
  },
  startedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  submittedAt: {
    type: Date,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: 60
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1
  },
  answeredQuestions: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: null,
    min: 0,
    max: 100
  },
  percentage: {
    type: Number,
    default: null,
    min: 0,
    max: 100
  },
  timeSpentSeconds: {
    type: Number,
    default: 0
  },
  isPassed: {
    type: Boolean,
    default: null
  },
  passingScore: {
    type: Number,
    default: 60
  },
  questionsData: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    selectedAnswer: {
      type: String,
      default: null
    },
    isCorrect: {
      type: Boolean,
      default: null
    },
    timeSpentSeconds: {
      type: Number,
      default: 0
    },
    attemptedAt: {
      type: Date,
      default: null
    }
  }],
  feedback: {
    type: String,
    default: null
  },
  reviewNotes: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    note: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'exam_sessions'
});

// Indexes for better query performance
examSessionSchema.index({ userId: 1, createdAt: -1 });
examSessionSchema.index({ userId: 1, status: 1 });
examSessionSchema.index({ courseId: 1, createdAt: -1 });
examSessionSchema.index({ createdAt: -1 });

// Virtuals
examSessionSchema.virtual('remainingTimeSeconds').get(function() {
  const now = new Date();
  const elapsedSeconds = Math.floor((now - this.startedAt) / 1000);
  const remainingSeconds = (this.durationMinutes * 60) - elapsedSeconds;
  return Math.max(0, remainingSeconds);
});

examSessionSchema.virtual('isExpired').get(function() {
  return this.remainingTimeSeconds === 0;
});

// Methods
examSessionSchema.methods.calculateScore = function() {
  if (this.totalQuestions === 0) return 0;
  return Math.round((this.correctAnswers / this.totalQuestions) * 100);
};

examSessionSchema.methods.markAsPassed = function() {
  this.isPassed = this.score >= this.passingScore;
  return this.isPassed;
};

examSessionSchema.methods.getPerformanceSummary = function() {
  return {
    totalQuestions: this.totalQuestions,
    answeredQuestions: this.answeredQuestions,
    correctAnswers: this.correctAnswers,
    score: this.score,
    percentage: this.percentage,
    isPassed: this.isPassed,
    timeSpent: `${Math.floor(this.timeSpentSeconds / 60)}:${(this.timeSpentSeconds % 60).toString().padStart(2, '0')}`,
    submittedAt: this.submittedAt
  };
};

module.exports = mongoose.model('ExamSession', examSessionSchema);
