const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free',
      index: true,
    },
    planStartDate: Date,
    planExpiresAt: Date,
    previousPlan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
    },
    previousPlanExpiresAt: Date,
    planHistory: [{
      plan: { type: String, enum: ['free', 'basic', 'premium'] },
      startDate: Date,
      endDate: Date,
      expiryDate: Date,
      changedAt: Date,
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    banReason: String,
    bannedAt: Date,
    unbanDate: Date,
    banDuration: String,
    stats: {
      questionsAttempted: { type: Number, default: 0 },
      questionsCorrect: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      topicsStudied: { type: Number, default: 0 },
    },
    lastSelectedUniversityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: false,
      index: true,
    },
    lastSelectedDepartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: false,
      index: true,
    },
    lastSelectedCourseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: false,
      index: true,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    emailVerificationTokenHash: {
      type: String,
      select: false,
    },
    emailVerificationTokenExpiresAt: Date,
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetTokenExpiresAt: Date,
    passwordResetOtpHash: {
      type: String,
      select: false,
    },
    passwordResetOtpExpiresAt: Date,
    refreshTokenHash: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
