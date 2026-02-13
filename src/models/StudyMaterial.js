const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema(
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
      enum: ['pdf', 'image', 'text', 'video', 'document'],
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileSize: Number,
    downloadCount: {
      type: Number,
      default: 0,
      index: true,
    },
    uploaderType: {
      type: String,
      enum: ['admin', 'faculty'],
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accessLevel: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

studyMaterialSchema.index({ courseId: 1, isActive: 1 });
studyMaterialSchema.index({ universityId: 1, departmentId: 1 });
studyMaterialSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
