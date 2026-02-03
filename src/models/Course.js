const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: true,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    creditUnits: {
      type: Number,
      min: 1,
    },
    level: {
      type: Number,
      enum: [100, 200, 300, 400, 500, 600],
      required: true,
      index: true,
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

courseSchema.index({ departmentId: 1, code: 1 }, { unique: true });
courseSchema.index({ universityId: 1, level: 1 });

module.exports = mongoose.model('Course', courseSchema);
