const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    abbreviation: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    country: {
      type: String,
      default: 'Nigeria',
    },
    state: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      studentsCount: { type: Number, default: 0 },
      coursesCount: { type: Number, default: 0 },
      questionsCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('University', universitySchema);
