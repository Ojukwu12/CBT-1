const mongoose = require('mongoose');

const planPricingSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ['basic', 'premium'],
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: Number,
      required: true,
      default: 30, // days
    },
    features: [{
      type: String,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    priceHistory: [{
      price: Number,
      changedAt: Date,
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: String,
    }],
  },
  { timestamps: true }
);

planPricingSchema.index({ plan: 1, isActive: 1 });

module.exports = mongoose.model('PlanPricing', planPricingSchema);
