/**
 * Paystack Payment Service
 * Handles all payment integration with Paystack
 */

const axios = require('axios');
const ApiError = require('../utils/ApiError');
const Logger = require('../utils/logger');

const logger = new Logger('PaystackService');

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
    this.baseUrl = 'https://api.paystack.co';

    if (!this.secretKey || !this.publicKey) {
      logger.warn('Paystack credentials not configured in .env');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Plan pricing configuration
   */
  getPlanPricing() {
    return {
      free: {
        name: 'Free',
        price: 0,
        duration: null,
        features: ['10 questions/day', 'Free questions only'],
      },
      basic: {
        name: 'Basic',
        price: 2999, // ₦2,999 per month (in Kobo: 299900)
        duration: 30, // days
        features: [
          '50 questions/day',
          'All free questions',
          'Basic questions access',
          'Question statistics',
        ],
      },
      premium: {
        name: 'Premium',
        price: 9999, // ₦9,999 per month (in Kobo: 999900)
        duration: 30, // days
        features: [
          'Unlimited questions',
          'All questions access',
          'Premium content',
          'Advanced statistics',
          'Performance analytics',
          'Priority support',
        ],
      },
    };
  }

  /**
   * Initialize payment transaction
   * Returns payment link/reference to complete on frontend
   */
  async initializePayment(userId, email, plan, metadata = {}) {
    try {
      if (!['basic', 'premium'].includes(plan)) {
        throw new ApiError(400, 'Invalid plan. Choose: basic or premium');
      }

      const pricing = this.getPlanPricing();
      const planConfig = pricing[plan];
      const amountInKobo = planConfig.price * 100; // Convert Naira to Kobo

      const payload = {
        email,
        amount: amountInKobo,
        metadata: {
          userId,
          plan,
          planName: planConfig.name,
          duration: planConfig.duration,
          ...metadata,
        },
      };

      logger.info(`Initializing payment for ${email} - Plan: ${plan}`);

      const response = await this.client.post('/transaction/initialize', payload);

      if (!response.data.status) {
        throw new ApiError(400, 'Failed to initialize payment');
      }

      return {
        success: true,
        reference: response.data.data.reference,
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        plan,
        amount: planConfig.price,
      };
    } catch (err) {
      logger.error(`Payment initialization failed for ${email}`, err);
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, 'Payment initialization failed');
    }
  }

  /**
   * Verify payment transaction
   * Called after user completes payment on Paystack
   */
  async verifyPayment(reference) {
    try {
      logger.info(`Verifying payment reference: ${reference}`);

      const response = await this.client.get(`/transaction/verify/${reference}`);

      if (!response.data.status || !response.data.data) {
        throw new ApiError(400, 'Payment verification failed');
      }

      const transaction = response.data.data;

      if (transaction.status !== 'success') {
        logger.warn(`Payment not successful: ${reference} - Status: ${transaction.status}`);
        return {
          success: false,
          status: transaction.status,
          message: 'Payment not completed',
        };
      }

      const { metadata, reference: ref, amount } = transaction;

      return {
        success: true,
        reference: ref,
        userId: metadata.userId,
        email: transaction.customer.email,
        plan: metadata.plan,
        amount: amount / 100, // Convert Kobo back to Naira
        planExpiryDays: metadata.duration,
        status: transaction.status,
        paidAt: new Date(transaction.paid_at),
      };
    } catch (err) {
      logger.error(`Payment verification failed for ${reference}`, err);
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, 'Payment verification failed');
    }
  }

  /**
   * Create recurring subscription (future implementation)
   * For automatic plan renewal
   */
  async createSubscription(email, plan, authorizationCode) {
    try {
      const pricing = this.getPlanPricing();
      const planConfig = pricing[plan];
      const amountInKobo = planConfig.price * 100;

      const payload = {
        customer: email,
        plan: plan,
        authorization: authorizationCode,
        start_date: new Date().toISOString().split('T')[0],
      };

      logger.info(`Creating subscription for ${email} - Plan: ${plan}`);

      // This endpoint may vary, adjust based on Paystack API
      const response = await this.client.post('/subscription', payload);

      return {
        success: response.data.status,
        subscriptionId: response.data.data?.subscription_code,
      };
    } catch (err) {
      logger.error(`Subscription creation failed for ${email}`, err);
      throw new ApiError(500, 'Subscription creation failed');
    }
  }

  /**
   * Disable subscription (unsubscribe user)
   */
  async disableSubscription(subscriptionCode, token) {
    try {
      logger.info(`Disabling subscription: ${subscriptionCode}`);

      const response = await this.client.post(`/subscription/${subscriptionCode}/disable`, {
        token,
      });

      return {
        success: response.data.status,
        message: 'Subscription disabled',
      };
    } catch (err) {
      logger.error(`Failed to disable subscription ${subscriptionCode}`, err);
      throw new ApiError(500, 'Failed to disable subscription');
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(reference) {
    try {
      const response = await this.client.get(`/transaction/${reference}`);

      if (!response.data.status) {
        throw new ApiError(404, 'Transaction not found');
      }

      return response.data.data;
    } catch (err) {
      logger.error(`Failed to get transaction ${reference}`, err);
      throw new ApiError(500, 'Failed to fetch transaction details');
    }
  }

  /**
   * Get all transactions for a customer
   */
  async getCustomerTransactions(email, limit = 50) {
    try {
      const response = await this.client.get('/transaction', {
        params: { email, limit },
      });

      if (!response.data.status) {
        return [];
      }

      return response.data.data;
    } catch (err) {
      logger.error(`Failed to fetch transactions for ${email}`, err);
      return [];
    }
  }

  /**
   * Verify webhook signature from Paystack
   * Paystack sends this in the x-paystack-signature header
   */
  verifyWebhookSignature(body, signature, rawBody = null) {
    try {
      const crypto = require('crypto');
      const payload = rawBody ? rawBody : Buffer.from(JSON.stringify(body));
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(payload)
        .digest('hex');
      
      const isValid = hash === signature;
      if (!isValid) {
        logger.warn('Invalid webhook signature detected');
      }
      return isValid;
    } catch (err) {
      logger.error('Webhook signature verification error:', err);
      return false;
    }
  }

  /**
   * Check if webhook request is from Paystack IP range
   * Optional additional security layer
   */
  isFromPaystackIP(clientIP) {
    try {
      // Paystack IP ranges (as of 2024 - should be updated periodically)
      const paystackIPs = [
        '52.88.84.215',
        '52.15.241.248',
        '54.80.249.152',
        '34.203.37.255',
      ];

      // Support IPv4 and also allow localhost for testing
      if (clientIP === '::1' || clientIP === '127.0.0.1') {
        return true; // Allow localhost for development
      }

      const ip = clientIP.split(',')[0].trim(); // Handle X-Forwarded-For header
      const isValid = paystackIPs.includes(ip);

      if (!isValid) {
        logger.warn(`Webhook received from unknown IP: ${ip}`);
      }

      return isValid;
    } catch (err) {
      logger.error('IP validation error:', err);
      return false; // Fail open to IP validation (webhook signature is primary security)
    }
  }

  /**
   * Log webhook event for debugging and monitoring
   */
  logWebhookEvent(event, data, status = 'received') {
    try {
      const logEntry = {
        timestamp: new Date(),
        event,
        reference: data?.reference,
        status,
        amount: data?.amount ? data.amount / 100 : null,
        email: data?.customer?.email,
      };

      logger.info(`Webhook ${status}: ${JSON.stringify(logEntry)}`);
    } catch (err) {
      logger.error('Error logging webhook event', err);
    }
  }
}

// Singleton instance
const paystackService = new PaystackService();

module.exports = paystackService;
