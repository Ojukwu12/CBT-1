const mongoose = require('mongoose');

const userAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  totalExamsAttempted: {
    type: Number,
    default: 0
  },
  totalExamsCompleted: {
    type: Number,
    default: 0
  },
  totalQuestionsAttempted: {
    type: Number,
    default: 0
  },
  totalCorrectAnswers: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  averageTimePerQuestion: {
    type: Number,
    default: 0
  },
  accuracyRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  strongTopics: [{
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic'
    },
    topicName: String,
    accuracyRate: Number,
    questionsAttempted: Number,
    lastAttemptedAt: Date
  }],
  weakTopics: [{
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic'
    },
    topicName: String,
    accuracyRate: Number,
    questionsAttempted: Number,
    lastAttemptedAt: Date
  }],
  topicStats: [{
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic'
    },
    topicName: String,
    questionsAttempted: Number,
    correctAnswers: Number,
    incorrectAnswers: Number,
    accuracyRate: Number,
    averageTime: Number,
    difficulty: String,
    lastAttemptedAt: Date
  }],
  performanceTrend: [{
    date: Date,
    examsTaken: Number,
    averageScore: Number,
    totalQuestions: Number,
    correctAnswers: Number
  }],
  streaks: {
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastActivityDate: Date
  },
  monthlyStats: [{
    month: String, // 'YYYY-MM'
    examsTaken: Number,
    totalQuestions: Number,
    correctAnswers: Number,
    averageScore: Number
  }],
  courseStats: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    courseName: String,
    examsTaken: Number,
    averageScore: Number,
    totalQuestions: Number,
    correctAnswers: Number,
    completionPercentage: Number,
    lastAttemptedAt: Date
  }],
  difficultyStats: {
    easy: {
      attempted: Number,
      correct: Number,
      accuracy: Number
    },
    medium: {
      attempted: Number,
      correct: Number,
      accuracy: Number
    },
    hard: {
      attempted: Number,
      correct: Number,
      accuracy: Number
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'user_analytics'
});

// Indexes
userAnalyticsSchema.index({ userId: 1 });
userAnalyticsSchema.index({ averageScore: -1 });
userAnalyticsSchema.index({ lastUpdated: -1 });

// Methods
userAnalyticsSchema.methods.updateStats = async function(examSession) {
  // This will be called from exam service after exam submission
  this.totalExamsAttempted = (this.totalExamsAttempted || 0) + 1;
  
  if (examSession.status === 'submitted' || examSession.status === 'graded') {
    this.totalExamsCompleted = (this.totalExamsCompleted || 0) + 1;
  }

  const previousCorrect = this.totalCorrectAnswers || 0;
  this.totalCorrectAnswers = previousCorrect + examSession.correctAnswers;
  
  const previousAttempted = this.totalQuestionsAttempted || 0;
  this.totalQuestionsAttempted = previousAttempted + examSession.totalQuestions;
  
  // Recalculate averages
  this.averageScore = Math.round(
    (this.totalCorrectAnswers / this.totalQuestionsAttempted) * 100
  );
  
  if (examSession.timeSpentSeconds > 0) {
    this.averageTimePerQuestion = Math.round(
      examSession.timeSpentSeconds / examSession.totalQuestions
    );
  }
  
  this.accuracyRate = this.averageScore;
  this.lastUpdated = new Date();
  
  return this.save();
};

userAnalyticsSchema.methods.getDashboard = function() {
  return {
    totalExams: this.totalExamsCompleted,
    totalQuestions: this.totalQuestionsAttempted,
    correctAnswers: this.totalCorrectAnswers,
    averageScore: this.averageScore,
    accuracyRate: this.accuracyRate,
    averageTimePerQuestion: this.averageTimePerQuestion,
    strongTopics: this.strongTopics.slice(0, 5),
    weakTopics: this.weakTopics.slice(0, 5),
    currentStreak: this.streaks?.currentStreak || 0,
    longestStreak: this.streaks?.longestStreak || 0,
    recentPerformance: this.performanceTrend?.slice(-7) || []
  };
};

module.exports = mongoose.model('UserAnalytics', userAnalyticsSchema);
