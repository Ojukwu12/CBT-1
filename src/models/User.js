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
    lastVerificationEmailSentAt: Date,
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
    lastPasswordResetEmailSentAt: Date,
    welcomeEmailSentAt: Date,
    refreshTokenHash: {
      type: String,
      select: false,
    },
    previousRefreshTokenHash: {
      type: String,
      select: false,
    },
    previousRefreshTokenValidUntil: {
      type: Date,
      select: false,
    },
    refreshSessions: [{
      tokenHash: {
        type: String,
        required: true,
      },
      source: {
        type: String,
        enum: ['cookie', 'header', 'authorization', 'body', 'unknown'],
        default: 'unknown',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      lastUsedAt: {
        type: Date,
        default: Date.now,
      },
      expiresAt: {
        type: Date,
        required: true,
      },
      previousTokenHash: {
        type: String,
        default: null,
      },
      previousTokenValidUntil: {
        type: Date,
        default: null,
      },
      revokedAt: {
        type: Date,
        default: null,
      },
    }],
  },
  { timestamps: true }
);

userSchema.index({ emailVerificationTokenExpiresAt: 1 }, { sparse: true });
userSchema.index({ passwordResetTokenExpiresAt: 1 }, { sparse: true });
userSchema.index({ passwordResetOtpExpiresAt: 1 }, { sparse: true });
userSchema.index({ previousRefreshTokenValidUntil: 1 }, { sparse: true });
userSchema.index({ welcomeEmailSentAt: 1 }, { sparse: true });

const clearExpiredAuthArtifactsInDoc = (user, now = new Date()) => {
  const nowMs = now.getTime();
  let changed = false;

  const clearFields = (fieldNames = []) => {
    for (const fieldName of fieldNames) {
      if (typeof user[fieldName] !== 'undefined') {
        user[fieldName] = undefined;
        changed = true;
      }
    }
  };

  if (user.emailVerificationTokenExpiresAt && user.emailVerificationTokenExpiresAt.getTime() <= nowMs) {
    clearFields(['emailVerificationTokenHash', 'emailVerificationTokenExpiresAt']);
  }

  if (user.passwordResetTokenExpiresAt && user.passwordResetTokenExpiresAt.getTime() <= nowMs) {
    clearFields(['passwordResetTokenHash', 'passwordResetTokenExpiresAt']);
  }

  if (user.passwordResetOtpExpiresAt && user.passwordResetOtpExpiresAt.getTime() <= nowMs) {
    clearFields(['passwordResetOtpHash', 'passwordResetOtpExpiresAt']);
  }

  if (user.previousRefreshTokenValidUntil && user.previousRefreshTokenValidUntil.getTime() <= nowMs) {
    clearFields(['previousRefreshTokenHash', 'previousRefreshTokenValidUntil']);
  }

  if (Array.isArray(user.refreshSessions)) {
    const filteredSessions = user.refreshSessions.filter((session) => {
      if (!session) return false;
      if (session.expiresAt && new Date(session.expiresAt).getTime() <= nowMs) return false;
      if (session.revokedAt) return false;
      return true;
    });

    if (filteredSessions.length !== user.refreshSessions.length) {
      user.refreshSessions = filteredSessions;
      changed = true;
    }
  }

  return changed;
};

userSchema.methods.clearExpiredAuthArtifacts = function clearExpiredAuthArtifacts(now = new Date()) {
  return clearExpiredAuthArtifactsInDoc(this, now);
};

userSchema.statics.clearExpiredAuthArtifacts = async function clearExpiredAuthArtifacts(now = new Date()) {
  const nowDate = now instanceof Date ? now : new Date(now);

  const users = await this.find({
    $or: [
      { emailVerificationTokenExpiresAt: { $type: 'date', $lte: nowDate } },
      { passwordResetTokenExpiresAt: { $type: 'date', $lte: nowDate } },
      { passwordResetOtpExpiresAt: { $type: 'date', $lte: nowDate } },
      { previousRefreshTokenValidUntil: { $type: 'date', $lte: nowDate } },
      { refreshSessions: { $elemMatch: { expiresAt: { $type: 'date', $lte: nowDate } } } },
      { refreshSessions: { $elemMatch: { revokedAt: { $type: 'date' } } } },
    ],
  }).select([
    '_id',
    '+emailVerificationTokenHash',
    'emailVerificationTokenExpiresAt',
    '+passwordResetTokenHash',
    'passwordResetTokenExpiresAt',
    '+passwordResetOtpHash',
    'passwordResetOtpExpiresAt',
    '+previousRefreshTokenHash',
    '+previousRefreshTokenValidUntil',
    'refreshSessions',
  ].join(' '));

  if (users.length === 0) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const operations = [];
  for (const user of users) {
    const changed = clearExpiredAuthArtifactsInDoc(user, nowDate);
    if (!changed) continue;

    const unsetFields = {};
    if (!user.emailVerificationTokenHash) unsetFields.emailVerificationTokenHash = 1;
    if (!user.emailVerificationTokenExpiresAt) unsetFields.emailVerificationTokenExpiresAt = 1;
    if (!user.passwordResetTokenHash) unsetFields.passwordResetTokenHash = 1;
    if (!user.passwordResetTokenExpiresAt) unsetFields.passwordResetTokenExpiresAt = 1;
    if (!user.passwordResetOtpHash) unsetFields.passwordResetOtpHash = 1;
    if (!user.passwordResetOtpExpiresAt) unsetFields.passwordResetOtpExpiresAt = 1;
    if (!user.previousRefreshTokenHash) unsetFields.previousRefreshTokenHash = 1;
    if (!user.previousRefreshTokenValidUntil) unsetFields.previousRefreshTokenValidUntil = 1;

    const update = {
      $set: {
        refreshSessions: user.refreshSessions || [],
      },
    };

    if (Object.keys(unsetFields).length > 0) {
      update.$unset = unsetFields;
    }

    operations.push({
      updateOne: {
        filter: { _id: user._id },
        update,
      },
    });
  }

  if (operations.length === 0) {
    return { matchedCount: users.length, modifiedCount: 0 };
  }

  const bulk = await this.bulkWrite(operations);
  return {
    matchedCount: users.length,
    modifiedCount: bulk.modifiedCount || 0,
  };
};

userSchema.pre('save', function preSaveAuthCleanup(next) {
  try {
    this.clearExpiredAuthArtifacts(new Date());
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);
