const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: false,
      index: true,
    },
    paystackReference: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      required: true,
      index: true,
    },
    originalPrice: {
      type: Number,
      required: true, // Original price before discount
    },
    discountAmount: {
      type: Number,
      default: 0, // Discount applied
    },
    amount: {
      type: Number,
      required: true, // Final amount paid (originalPrice - discountAmount)
    },
    promoCode: {
      type: String,
      uppercase: true,
      default: null,
      index: true,
    },
    promoCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromoCode',
      default: null,
    },
    planExpiryDate: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    failureReason: String,

    // Paystack metadata
    paystackCustomerId: String,
    authorizationCode: String, // For recurring payments
    last4Digits: String,
    cardBrand: String,

    // Timestamps
    initiatedAt: Date,
    completedAt: Date,
    verifiedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
