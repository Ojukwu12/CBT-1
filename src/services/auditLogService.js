/**
 * Audit Log Service
 * Centralized service for logging security-sensitive actions
 */

const AuditLog = require('../models/AuditLog');
const Logger = require('../utils/logger');
const { env } = require('../config/env');

const logger = new Logger('AuditLogService', env.NODE_ENV === 'development');

class AuditLogService {
  /**
   * Create an audit log entry
   * @param {string} action - Type of action (see AuditLog schema for valid values)
   * @param {string} userId - ID of the user affected
   * @param {object} options - Additional options
   * @param {string} options.performedBy - ID of admin performing the action (if applicable)
   * @param {string} options.ipAddress - Client IP address
   * @param {string} options.userAgent - Client user agent
   * @param {string} options.resourceType - Type of resource affected
   * @param {string} options.resourceId - ID of affected resource
   * @param {object} options.details - Action-specific details
   * @param {string} options.status - 'success', 'failure', or 'pending'
   * @param {string} options.errorMessage - Error message if failed
   * @param {object} options.metadata - Additional metadata
   * @returns {Promise<object>} Created audit log document
   */
  static async log(action, userId, options = {}) {
    try {
      const auditLog = await AuditLog.create({
        action,
        userId,
        performedBy: options.performedBy || null,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
        resourceType: options.resourceType || null,
        resourceId: options.resourceId || null,
        details: options.details || null,
        status: options.status || 'success',
        errorMessage: options.errorMessage || null,
        metadata: options.metadata || null,
      });

      logger.info(`Audit log created: ${action} for user ${userId}`);
      return auditLog;
    } catch (err) {
      // Don't fail the operation if audit logging fails
      logger.error('Failed to create audit log:', err);
      return null;
    }
  }

  /**
   * Log payment initialization
   */
  static async logPaymentInit(userId, plan, transactionId, ipAddress, userAgent) {
    return this.log('payment_init', userId, {
      resourceType: 'Payment',
      resourceId: transactionId,
      details: { plan },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log payment verification
   */
  static async logPaymentVerify(userId, transactionId, status, amount, ipAddress, userAgent) {
    return this.log('payment_verify', userId, {
      resourceType: 'Payment',
      resourceId: transactionId,
      details: { status, amount },
      status: status === 'success' ? 'success' : 'failure',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log plan upgrade
   */
  static async logPlanUpgrade(userId, fromPlan, toPlan, transactionId) {
    return this.log('plan_upgrade', userId, {
      resourceType: 'Plan',
      resourceId: userId,
      details: { fromPlan, toPlan, transactionId },
    });
  }

  /**
   * Log plan downgrade
   */
  static async logPlanDowngrade(userId, fromPlan, toPlan, reason, performedBy) {
    return this.log('plan_downgrade', userId, {
      performedBy,
      resourceType: 'Plan',
      resourceId: userId,
      details: { fromPlan, toPlan, reason },
    });
  }

  /**
   * Log user ban
   */
  static async logUserBan(userId, banReason, duration, performedBy, ipAddress) {
    return this.log('user_banned', userId, {
      performedBy,
      ipAddress,
      resourceType: 'User',
      resourceId: userId,
      details: { reason: banReason, duration },
    });
  }

  /**
   * Log user unban
   */
  static async logUserUnban(userId, performedBy, ipAddress) {
    return this.log('user_unbanned', userId, {
      performedBy,
      ipAddress,
      resourceType: 'User',
      resourceId: userId,
    });
  }

  /**
   * Log user role change
   */
  static async logUserRoleChange(userId, oldRole, newRole, performedBy, ipAddress) {
    return this.log('user_role_changed', userId, {
      performedBy,
      ipAddress,
      resourceType: 'User',
      resourceId: userId,
      details: { oldRole, newRole },
    });
  }

  /**
   * Log login attempt
   */
  static async logLoginAttempt(userId, ipAddress, userAgent, success = true) {
    return this.log('login_attempt', userId, {
      ipAddress,
      userAgent,
      status: success ? 'success' : 'failure',
    });
  }

  /**
   * Log logout
   */
  static async logLogout(userId, ipAddress) {
    return this.log('logout', userId, {
      ipAddress,
    });
  }

  /**
   * Log question approval
   */
  static async logQuestionApproved(questionId, approvedBy, ipAddress) {
    return this.log('question_approved', approvedBy, {
      performedBy: approvedBy,
      ipAddress,
      resourceType: 'Question',
      resourceId: questionId,
    });
  }

  /**
   * Log question rejection
   */
  static async logQuestionRejected(questionId, rejectedBy, reason, ipAddress) {
    return this.log('question_rejected', rejectedBy, {
      performedBy: rejectedBy,
      ipAddress,
      resourceType: 'Question',
      resourceId: questionId,
      details: { reason },
    });
  }

  /**
   * Get audit logs for a user
   */
  static async getUserLogs(userId, limit = 50, skip = 0) {
    try {
      const logs = await AuditLog.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
      
      const total = await AuditLog.countDocuments({ userId });
      
      return { logs, total };
    } catch (err) {
      logger.error('Failed to retrieve user audit logs:', err);
      throw err;
    }
  }

  /**
   * Get audit logs by action
   */
  static async getLogsByAction(action, limit = 50, skip = 0) {
    try {
      const logs = await AuditLog.find({ action })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
      
      const total = await AuditLog.countDocuments({ action });
      
      return { logs, total };
    } catch (err) {
      logger.error('Failed to retrieve audit logs by action:', err);
      throw err;
    }
  }

  /**
   * Get audit logs for a resource
   */
  static async getResourceLogs(resourceType, resourceId) {
    try {
      const logs = await AuditLog.find({
        resourceType,
        resourceId,
      }).sort({ createdAt: -1 });
      
      return logs;
    } catch (err) {
      logger.error('Failed to retrieve resource audit logs:', err);
      throw err;
    }
  }

  /**
   * Get failed audit logs (for monitoring security issues)
   */
  static async getFailedLogs(limit = 50, skip = 0) {
    try {
      const logs = await AuditLog.find({ status: 'failure' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
      
      const total = await AuditLog.countDocuments({ status: 'failure' });
      
      return { logs, total };
    } catch (err) {
      logger.error('Failed to retrieve failed audit logs:', err);
      throw err;
    }
  }
}

module.exports = AuditLogService;
