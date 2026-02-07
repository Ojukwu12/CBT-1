/**
 * Scheduled Tasks Service
 * Handles background jobs like plan expiry checks, email reminders, etc.
 */

const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const emailService = require('./emailService');
const Logger = require('../utils/logger');

const logger = new Logger('ScheduledTasks');

class ScheduledTasksService {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Initialize all scheduled tasks
   */
  initialize() {
    if (this.isRunning) {
      logger.warn('Scheduled tasks already running');
      return;
    }

    try {
      this.scheduleAutoDowngradeExpiredPlans();
      this.schedulePlanExpiryWarnings();
      this.scheduleTransactionCleanup();
      this.isRunning = true;
      logger.info('All scheduled tasks initialized successfully');
    } catch (err) {
      logger.error('Failed to initialize scheduled tasks', err);
      throw err;
    }
  }

  /**
   * Auto-downgrade expired plans (runs daily at 2 AM)
   * Downgrades users with expired plans to free tier
   */
  scheduleAutoDowngradeExpiredPlans() {
    const task = cron.schedule('0 2 * * *', async () => {
      logger.info('Starting auto-downgrade of expired plans');
      try {
        const now = new Date();
        const result = await User.updateMany(
          {
            plan: { $in: ['basic', 'premium'] },
            planExpiresAt: { $lt: now },
          },
          {
            $set: {
              plan: 'free',
              planExpiresAt: null,
            },
          }
        );

        if (result.modifiedCount > 0) {
          logger.info(`Auto-downgraded ${result.modifiedCount} users with expired plans`);
        }
      } catch (err) {
        logger.error('Auto-downgrade scheduled task failed', err);
      }
    });

    this.jobs.push(task);
    logger.info('Scheduled: Auto-downgrade expired plans (daily at 2 AM)');
  }

  /**
   * Send plan expiry warning emails (runs daily at 8 AM)
   * Sends emails at 30 days, 7 days, and 1 day before expiry
   */
  schedulePlanExpiryWarnings() {
    const task = cron.schedule('0 8 * * *', async () => {
      logger.info('Starting plan expiry warning emails');
      try {
        const now = new Date();

        // Calculate date ranges for warnings
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const thirtyOneDaysFromNow = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);

        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const eightDaysFromNow = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

        const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
        const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

        // Send 30-day warning
        await this.sendExpiryWarnings('30 days', thirtyDaysFromNow, thirtyOneDaysFromNow, 30);

        // Send 7-day warning
        await this.sendExpiryWarnings('7 days', sevenDaysFromNow, eightDaysFromNow, 7);

        // Send 1-day warning
        await this.sendExpiryWarnings('1 day', oneDayFromNow, twoDaysFromNow, 1);

        logger.info('Plan expiry warning emails sent successfully');
      } catch (err) {
        logger.error('Plan expiry warning scheduled task failed', err);
      }
    });

    this.jobs.push(task);
    logger.info('Scheduled: Plan expiry warnings (daily at 8 AM)');
  }

  /**
   * Helper method to send expiry warnings
   */
  async sendExpiryWarnings(warningType, startDate, endDate, daysRemaining) {
    try {
      const users = await User.find({
        plan: { $in: ['basic', 'premium'] },
        planExpiresAt: { $gte: startDate, $lt: endDate },
      }).select('email firstName planExpiresAt');

      let sentCount = 0;
      for (const user of users) {
        try {
          await emailService.sendPlanExpiryWarningEmail(user, daysRemaining, user.planExpiresAt);
          sentCount++;
        } catch (err) {
          logger.error(`Failed to send ${warningType} warning to ${user.email}`, err);
          // Continue with next user even if one fails
        }
      }

      if (sentCount > 0) {
        logger.info(`Sent ${warningType} warnings to ${sentCount} users`);
      }
    } catch (err) {
      logger.error(`Error sending ${warningType} warnings`, err);
    }
  }

  /**
   * Clean up old pending transactions (runs weekly on Sunday at 3 AM)
   * Removes pending transactions older than 30 days
   */
  scheduleTransactionCleanup() {
    const task = cron.schedule('0 3 * * 0', async () => {
      logger.info('Starting transaction cleanup');
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const result = await Transaction.deleteMany({
          status: 'pending',
          createdAt: { $lt: thirtyDaysAgo },
        });

        if (result.deletedCount > 0) {
          logger.info(`Cleaned up ${result.deletedCount} old pending transactions`);
        }
      } catch (err) {
        logger.error('Transaction cleanup scheduled task failed', err);
      }
    });

    this.jobs.push(task);
    logger.info('Scheduled: Transaction cleanup (weekly on Sunday at 3 AM)');
  }

  /**
   * Stop all scheduled tasks (for graceful shutdown)
   */
  stopAll() {
    this.jobs.forEach((job) => {
      job.stop();
    });
    this.isRunning = false;
    logger.info(`Stopped ${this.jobs.length} scheduled tasks`);
  }

  /**
   * Get status of all scheduled tasks
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      taskCount: this.jobs.length,
      tasks: [
        'Auto-downgrade expired plans (daily at 2 AM)',
        'Plan expiry warnings (daily at 8 AM)',
        'Transaction cleanup (weekly on Sunday at 3 AM)',
      ],
    };
  }
}

// Singleton instance
const scheduledTasksService = new ScheduledTasksService();

module.exports = scheduledTasksService;
