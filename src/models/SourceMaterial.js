const mongoose = require('mongoose');

const sourceMaterialSchema = new mongoose.Schema(
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
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: String,
    fileType: {
      type: String,
      enum: ['pdf', 'image', 'text'],
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileSize: Number,
    content: {
      type: String,
      default: null,
    },
    extractionMethod: {
      type: String,
      enum: ['ocr', 'ai_generated'],
      required: true,
    },
    processingStatus: {
      type: String,
      enum: ['uploaded', 'processing', 'completed', 'failed'],
      default: 'uploaded',
      index: true,
    },
    processingError: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questionsGenerated: {
      type: Number,
      default: 0,
    },
    questionsIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    }],
    processingStartedAt: Date,
    processingCompletedAt: Date,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

sourceMaterialSchema.index({ courseId: 1, processingStatus: 1 });
sourceMaterialSchema.index({ universityId: 1, departmentId: 1 });
sourceMaterialSchema.index({ uploadedBy: 1, createdAt: -1 });
sourceMaterialSchema.index({ processingStatus: 1, createdAt: -1 });

module.exports = mongoose.model('SourceMaterial', sourceMaterialSchema);
