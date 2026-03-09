const mongoose = require('mongoose');

const guestPushTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web', 'unknown'],
      default: 'unknown',
    },
    deviceId: {
      type: String,
      default: null,
      index: true,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    consentGiven: {
      type: Boolean,
      default: true,
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

guestPushTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

guestPushTokenSchema.index({ claimedBy: 1, expiresAt: 1 });

guestPushTokenSchema.index({ deviceId: 1, claimedBy: 1 });

module.exports = mongoose.model('GuestPushToken', guestPushTokenSchema);
