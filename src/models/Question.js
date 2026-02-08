const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    level: {
      type: Number,
      enum: [100, 200, 300, 400, 500, 600],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      A: { type: String, required: true, trim: true },
      B: { type: String, required: true, trim: true },
      C: { type: String, required: true, trim: true },
      D: { type: String, required: true, trim: true },
    },
    correctAnswer: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      index: true,
    },
    source: {
      type: String,
      enum: ['AI', 'Human'],
      default: 'AI',
      index: true,
    },
    accessLevel: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    approvalNotes: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    stats: {
      timesAttempted: { type: Number, default: 0, index: true },
      correctAnswers: { type: Number, default: 0 },
      incorrectAnswers: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      averageTimeSeconds: { type: Number, default: 0 },
      lastAttemptedAt: { type: Date, default: null },
      usageCount: { type: Number, default: 0 }
    },
  },
  { timestamps: true }
);

questionSchema.index({ universityId: 1, courseId: 1, topicId: 1 });
questionSchema.index({ universityId: 1, status: 1, accessLevel: 1 });
questionSchema.index({ universityId: 1, departmentId: 1, level: 1 });
questionSchema.index({ createdBy: 1, status: 1 });
questionSchema.index({ text: 'text' });

module.exports = mongoose.model('Question', questionSchema);
