const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    applicablePlans: [{
      type: String,
      enum: ['basic', 'premium'],
    }],
    maxUsageCount: {
      type: Number,
      default: null, // null = unlimited
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    maxUsagePerUser: {
      type: Number,
      default: 1,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    usedBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
      },
      usedAt: Date,
      amount: Number,
      discountApplied: Number,
    }],
  },
  { timestamps: true }
);

promoCodeSchema.index({ code: 1, isActive: 1 });
promoCodeSchema.index({ validFrom: 1, validUntil: 1 });

// Method to check if promo is valid
promoCodeSchema.methods.isValid = function() {
  const now = new Date();
  return (
    this.isActive &&
    this.validFrom <= now &&
    this.validUntil >= now &&
    (this.maxUsageCount === null || this.usageCount < this.maxUsageCount)
  );
};

// Method to check if user can use this promo
promoCodeSchema.methods.canUserUse = function(userId) {
  const userUsageCount = this.usedBy.filter(
    (usage) => usage.userId.toString() === userId.toString()
  ).length;
  return userUsageCount < this.maxUsagePerUser;
};

// Method to calculate discount
promoCodeSchema.methods.calculateDiscount = function(originalPrice) {
  if (this.discountType === 'percentage') {
    return Math.round((originalPrice * this.discountValue) / 100);
  }
  return Math.min(this.discountValue, originalPrice);
};

module.exports = mongoose.model('PromoCode', promoCodeSchema);
