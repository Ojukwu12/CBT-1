const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['global', 'university', 'course', 'monthly'],
    required: true,
    index: true
  },
  universityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'University',
    default: null,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null,
    index: true
  },
  month: {
    type: String,
    default: null,
    index: true
  },
  rankings: [{
    rank: Number,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    firstName: String,
    lastName: String,
    email: String,
    score: Number,
    examsCompleted: Number,
    accuracy: Number,
    totalQuestions: Number,
    correctAnswers: Number,
    lastExamDate: Date,
    streak: Number
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'leaderboards'
});

// Indexes
leaderboardSchema.index({ type: 1, universityId: 1, courseId: 1, month: 1 });
leaderboardSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
