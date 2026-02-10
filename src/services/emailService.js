/**
 * Email Service
 * Handles all email sending with templates using Brevo
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ApiError = require('../utils/ApiError');
const Logger = require('../utils/logger');
const { env } = require('../config/env');

const logger = new Logger('EmailService');

/**
 * Get the API base URL - throw error in production if not configured
 */
const getApiBaseUrl = () => {
  if (env.BASE_URL) {
    return env.BASE_URL;
  }
  
  // In production, BASE_URL must be set
  if (env.NODE_ENV === 'production') {
    throw new Error('BASE_URL environment variable must be set in production');
  }
  
  // In development, default to localhost
  return 'http://localhost:3000';
};

class EmailService {
  constructor() {
    this.apiKey = env.BREVO_API_KEY;
    this.apiUrl = 'https://api.brevo.com/v3';
    this.senderEmail = env.EMAIL_FROM || 'noreply@universitycbt.com';
    this.senderName = 'University CBT';
    this.templatesDir = path.join(__dirname, '../templates/emails');
    this.baseUrl = getApiBaseUrl();

    if (!this.apiKey) {
      logger.warn('Brevo API key not configured. Email functionality will be limited.');
    }
  }

  /**
   * Load email template
   */
  loadTemplate(templateName) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.html`);
      if (!fs.existsSync(templatePath)) {
        throw new ApiError(500, `Email template not found: ${templateName}`);
      }
      return fs.readFileSync(templatePath, 'utf8');
    } catch (err) {
      logger.error(`Failed to load template ${templateName}`, err);
      throw err;
    }
  }

  /**
   * Compile template with variables
   */
  compileTemplate(template, variables) {
    let compiled = template;

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      compiled = compiled.replace(regex, variables[key]);
    });

    return compiled;
  }

  /**
   * Send email via Brevo API
   */
  async send(to, subject, template, variables = {}) {
    try {
      const htmlContent = this.loadTemplate(template);
      const compiledHtml = this.compileTemplate(htmlContent, variables);

      // If no API key, just log (development mode)
      if (!this.apiKey) {
        logger.info(`[DEV MODE] Email sent to ${to} - Subject: ${subject}`);
        return {
          success: true,
          to,
          subject,
          template,
          isDev: true,
          timestamp: new Date(),
        };
      }

      // Send via Brevo API
      const response = await axios.post(
        `${this.apiUrl}/smtp/email`,
        {
          to: [
            {
              email: to,
            },
          ],
          sender: {
            email: this.senderEmail,
            name: this.senderName,
          },
          subject,
          htmlContent: compiledHtml,
          replyTo: {
            email: env.SUPPORT_EMAIL || 'support@universitycbt.com',
          },
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Email sent to ${to} - Subject: ${subject} - MessageID: ${response.data.messageId}`);

      return {
        success: true,
        to,
        subject,
        template,
        messageId: response.data.messageId,
        timestamp: new Date(),
      };
    } catch (err) {
      logger.error(`Failed to send email to ${to}`, err.response?.data || err.message);
      throw new ApiError(500, 'Failed to send email');
    }
  }

  /**
   * Welcome email - sent when user registers
   */
  async sendWelcomeEmail(user) {
    return this.send(user.email, 'Welcome to University CBT!', 'welcome', {
      firstName: user.firstName,
      email: user.email,
      appName: 'University AI CBT',
      appUrl: env.APP_URL || this.baseUrl,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Plan upgrade email
   */
  async sendPlanUpgradeEmail(user, oldPlan, newPlan, expiryDate) {
    return this.send(user.email, `Plan Upgraded to ${newPlan}!`, 'plan-upgrade', {
      firstName: user.firstName,
      oldPlan,
      newPlan,
      expiryDate: new Date(expiryDate).toLocaleDateString(),
      appUrl: env.APP_URL || this.baseUrl,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Plan downgrade email
   */
  async sendPlanDowngradeEmail(user, oldPlan, newPlan) {
    return this.send(user.email, `Plan Changed to ${newPlan}`, 'plan-downgrade', {
      firstName: user.firstName,
      oldPlan,
      newPlan,
      appUrl: env.APP_URL || this.baseUrl,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Payment receipt email
   */
  async sendPaymentReceiptEmail(user, transaction) {
    return this.send(user.email, 'Payment Receipt', 'payment-receipt', {
      firstName: user.firstName,
      transactionId: transaction.transactionId || transaction._id,
      amount: `₦${transaction.amount.toLocaleString()}`,
      plan: transaction.plan,
      paymentDate: new Date().toLocaleDateString(),
      expiryDate: new Date(transaction.planExpiryDate).toLocaleDateString(),
      appUrl: env.APP_URL || this.baseUrl,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Payment failed email
   */
  async sendPaymentFailedEmail(user, amount, reason) {
    return this.send(user.email, 'Payment Failed', 'payment-failed', {
      firstName: user.firstName,
      amount: `₦${amount.toLocaleString()}`,
      reason,
      appUrl: env.APP_URL || this.baseUrl,
      baseUrl: this.baseUrl,
      supportEmail: env.SUPPORT_EMAIL || 'support@universitycbt.com',
    });
  }

  /**
   * Plan expiry warning email (30 days before)
   */
  async sendPlanExpiryWarningEmail(user, daysRemaining, expiryDate) {
    return this.send(user.email, 'Your Plan Expires Soon!', 'plan-expiry-warning', {
      firstName: user.firstName,
      daysRemaining,
      expiryDate: new Date(expiryDate).toLocaleDateString(),
      renewalUrl: `${env.BASE_URL || 'http://localhost:3000'}/api/payments/plans`,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Plan expired email
   */
  async sendPlanExpiredEmail(user) {
    return this.send(user.email, 'Your Plan Has Expired', 'plan-expired', {
      firstName: user.firstName,
      renewalUrl: `${env.BASE_URL || 'http://localhost:3000'}/api/payments/plans`,
      appUrl: env.APP_URL || 'http://localhost:3000',
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Password reset email (OTP + magic link)
   */
  async sendPasswordResetOptionsEmail(user, { otp, resetLink, expiresInMinutes }) {
    return this.send(user.email, 'Reset your password', 'reset-password-options', {
      firstName: user.firstName || 'User',
      otp,
      resetLink,
      expiresInMinutes,
      supportEmail: env.SUPPORT_EMAIL || 'support@universitycbt.com',
      appUrl: env.APP_URL || this.baseUrl,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Email verification (magic link only)
   */
  async sendEmailVerificationLink(user, { verifyLink, expiresInMinutes }) {
    return this.send(user.email, 'Verify your email address', 'verify-email', {
      firstName: user.firstName || 'User',
      verifyLink,
      expiresInMinutes,
      supportEmail: env.SUPPORT_EMAIL || 'support@universitycbt.com',
      appUrl: env.APP_URL || this.baseUrl,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Question approved email (admin notification)
   */
  async sendQuestionApprovedEmail(admin, question, approver) {
    return this.send(admin.email, 'Question Approved', 'question-approved', {
      firstName: admin.firstName,
      questionText: question.text.substring(0, 100),
      approverId: approver.firstName,
      approvalDate: new Date().toLocaleDateString(),
      appUrl: env.APP_URL || 'http://localhost:3000',
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Question rejected email (with reason)
   */
  async sendQuestionRejectedEmail(admin, question, reason) {
    return this.send(admin.email, 'Question Rejected', 'question-rejected', {
      firstName: admin.firstName,
      questionText: question.text.substring(0, 100),
      rejectionReason: reason || 'No reason provided',
      resubmitUrl: `${env.BASE_URL || 'http://localhost:3000'}/api/questions/${question._id}`,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * OTP email
   */
  async sendOTPEmail(email, otp, expiryMinutes = 10) {
    return this.send(email, 'Your Login Code', 'otp', {
      otp,
      expiryMinutes,
      appName: 'University AI CBT',
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Reset password email
   */
  async sendResetPasswordEmail(email, resetLink, expiryHours = 24) {
    return this.send(email, 'Reset Your Password', 'reset-password', {
      resetLink,
      expiryHours,
      appUrl: env.APP_URL || 'http://localhost:3000',
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Contact form notification (admin receives user message)
   */
  async sendContactFormEmail(name, email, subject, message) {
    return this.send(env.SUPPORT_EMAIL || 'support@universitycbt.com', `New Contact: ${subject}`, 'contact-form', {
      senderName: name,
      senderEmail: email,
      subject,
      message,
      replyUrl: `mailto:${email}`,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Send bulk email to multiple users
   */
  async sendBulkEmail(recipients, subject, template, variables = {}) {
    try {
      if (!recipients || recipients.length === 0) {
        throw new ApiError(400, 'No recipients provided');
      }

      const htmlContent = this.loadTemplate(template);
      const compiledHtml = this.compileTemplate(htmlContent, variables);

      // If no API key, just log (development mode)
      if (!this.apiKey) {
        logger.info(`[DEV MODE] Bulk email sent to ${recipients.length} recipients - Subject: ${subject}`);
        return {
          success: true,
          recipientCount: recipients.length,
          subject,
          template,
          isDev: true,
          timestamp: new Date(),
        };
      }

      // Send via Brevo API
      const response = await axios.post(
        `${this.apiUrl}/smtp/email`,
        {
          to: recipients.map(email => ({ email })),
          sender: {
            email: this.senderEmail,
            name: this.senderName,
          },
          subject,
          htmlContent: compiledHtml,
          replyTo: {
            email: env.SUPPORT_EMAIL || 'support@universitycbt.com',
          },
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Bulk email sent to ${recipients.length} recipients - Subject: ${subject} - MessageID: ${response.data.messageId}`);

      return {
        success: true,
        recipientCount: recipients.length,
        subject,
        template,
        messageId: response.data.messageId,
        timestamp: new Date(),
      };
    } catch (err) {
      logger.error(`Failed to send bulk email`, err.response?.data || err.message);
      throw new ApiError(500, 'Failed to send bulk email');
    }
  }

  /**
   * Send admin notification email
   */
  async sendAdminNotificationEmail(adminEmail, title, content, actionUrl = null) {
    const variables = {
      adminEmail,
      title,
      content,
      actionUrl: actionUrl || '#',
      actionText: actionUrl ? 'View Details' : '',
      appUrl: env.APP_URL || 'http://localhost:3000',
      timestamp: new Date().toLocaleString(),
    };

    return this.send(adminEmail, `Admin Notification: ${title}`, 'admin-notification', variables);
  }

  /**
   * Send system alert to admin
   */
  async sendAdminAlertEmail(adminEmail, severity, alertTitle, alertMessage) {
    const variables = {
      severity: severity.toUpperCase(), // 'warning', 'critical', 'info'
      alertTitle,
      alertMessage,
      timestamp: new Date().toLocaleString(),
      dashboardUrl: `${env.APP_URL || 'http://localhost:3000'}/admin/dashboard`,
    };

    return this.send(
      adminEmail,
      `[${severity.toUpperCase()}] ${alertTitle}`,
      'admin-alert',
      variables
    );
  }

  /**
   * Send user suspension/ban notification
   */
  async sendUserBanNotificationEmail(user, reason, banDuration = null) {
    const variables = {
      firstName: user.firstName,
      reason,
      banDuration: banDuration || 'Permanent',
      supportEmail: env.SUPPORT_EMAIL || 'support@universitycbt.com',
      appUrl: env.APP_URL || 'http://localhost:3000',
    };

    return this.send(
      user.email,
      'Account Suspension Notice',
      'user-ban-notification',
      variables
    );
  }
}

// Singleton instance
const emailService = new EmailService();

module.exports = emailService;
