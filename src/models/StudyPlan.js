const mongoose = require('mongoose');

const studyPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  topicIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  }],
  topics: [{
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic'
    },
    topicName: String,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started'
    },
    completedDate: {
      type: Date,
      default: null
    },
    questionsAttempted: {
      type: Number,
      default: 0
    },
    questionsCorrect: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0
    }
  }],
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active',
    index: true
  },
  startDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  durationDays: {
    type: Number,
    required: true,
    min: 1
  },
  dailyGoal: {
    type: Number,
    default: 5,
    min: 1
  },
  progress: {
    completedTopics: {
      type: Number,
      default: 0
    },
    totalTopics: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  milestones: [{
    name: String,
    targetDate: Date,
    completed: Boolean,
    completedDate: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'study_plans'
});

// Indexes
studyPlanSchema.index({ userId: 1, courseId: 1 });
studyPlanSchema.index({ userId: 1, status: 1 });
studyPlanSchema.index({ courseId: 1, status: 1 });

// Methods
studyPlanSchema.methods.calculateProgress = function() {
  if (this.topics.length === 0) return 0;
  const completed = this.topics.filter(t => t.status === 'completed').length;
  this.progress.completedTopics = completed;
  this.progress.totalTopics = this.topics.length;
  this.progress.percentage = Math.round((completed / this.topics.length) * 100);
  this.progress.lastUpdated = new Date();
  return this.progress.percentage;
};

studyPlanSchema.methods.markTopicComplete = function(topicId) {
  const topic = this.topics.find(t => t.topicId.toString() === topicId.toString());
  if (topic) {
    topic.status = 'completed';
    topic.completedDate = new Date();
  }
  this.calculateProgress();
};

studyPlanSchema.methods.getStatus = function() {
  const now = new Date();
  if (this.endDate < now) {
    return 'expired';
  }
  return this.status;
};

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
