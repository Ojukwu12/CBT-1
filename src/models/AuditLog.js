const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'payment_init',           // Payment initialization
        'payment_verify',         // Payment verification
        'plan_upgrade',           // Plan upgraded
        'plan_downgrade',         // Plan downgraded
        'user_banned',            // User banned by admin
        'user_unbanned',          // User unbanned by admin
        'user_role_changed',      // User role changed
        'admin_action',           // Generic admin action
        'login_attempt',          // Login attempt
        'logout',                 // User logout
        'question_approved',      // Question approved by admin
        'question_rejected',      // Question rejected by admin
      ],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // null if action performed by the user themselves
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    resourceType: {
      // Type of resource affected (User, Payment, Question, etc.)
      type: String,
      trim: true,
    },
    resourceId: {
      // ID of the affected resource
      type: String,
      trim: true,
    },
    details: {
      // Action-specific details
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'pending'],
      default: 'success',
    },
    errorMessage: {
      // Error message if status is failure
      type: String,
      default: null,
    },
    metadata: {
      // Additional metadata
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Create indexes for efficient queries
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });

// Auto-delete audit logs after 90 days (TTL index) - must be separate and ascending
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
