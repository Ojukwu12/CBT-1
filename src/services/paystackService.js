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
}

// Singleton instance
const paystackService = new PaystackService();

module.exports = paystackService;
