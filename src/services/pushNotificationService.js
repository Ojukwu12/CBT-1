const admin = require('firebase-admin');
const { env } = require('../config/env');
const Logger = require('../utils/logger');

const logger = new Logger('PushNotificationService');

class PushNotificationService {
  constructor() {
    this.provider = (env.PUSH_PROVIDER || 'firebase').toLowerCase();
    this.firebaseInitialized = false;
  }

  isEnabled() {
    if (this.provider === 'none') {
      return false;
    }

    if (this.provider === 'firebase' || this.provider === 'fcm') {
      return Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    }

    return false;
  }

  getFirebaseApp() {
    if (this.firebaseInitialized) {
      return admin.app();
    }

    if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      return null;
    }

    try {
      const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      const initOptions = {
        credential: admin.credential.cert(serviceAccount),
      };

      if (env.FIREBASE_PROJECT_ID) {
        initOptions.projectId = env.FIREBASE_PROJECT_ID;
      }

      admin.initializeApp(initOptions);
      this.firebaseInitialized = true;
      logger.info('Firebase Admin initialized for push notifications');
      return admin.app();
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK', error);
      return null;
    }
  }

  async sendToTokens(tokens = [], payload = {}) {
    const uniqueTokens = [...new Set((tokens || []).filter(Boolean))];

    if (uniqueTokens.length === 0) {
      return {
        provider: this.provider,
        attempted: 0,
        sent: 0,
        failed: 0,
        skipped: true,
        reason: 'No tokens provided',
      };
    }

    if (!this.isEnabled()) {
      logger.warn('Push notifications skipped: provider disabled or missing credentials', {
        provider: this.provider,
      });

      return {
        provider: this.provider,
        attempted: uniqueTokens.length,
        sent: 0,
        failed: 0,
        skipped: true,
        reason: 'Push provider is not configured',
      };
    }

    if (this.provider === 'firebase' || this.provider === 'fcm') {
      return this.sendViaFirebase(uniqueTokens, payload);
    }

    return {
      provider: this.provider,
      attempted: uniqueTokens.length,
      sent: 0,
      failed: uniqueTokens.length,
      skipped: true,
      reason: `Unsupported push provider: ${this.provider}`,
    };
  }

  async sendViaFirebase(tokens, payload) {
    const app = this.getFirebaseApp();
    if (!app) {
      return {
        provider: 'firebase',
        attempted: tokens.length,
        sent: 0,
        failed: tokens.length,
        skipped: true,
        reason: 'Firebase Admin SDK is not configured correctly',
      };
    }

    const maxBatchSize = Math.max(1, env.PUSH_FCM_BATCH_SIZE || 500);
    const batches = [];

    for (let index = 0; index < tokens.length; index += maxBatchSize) {
      batches.push(tokens.slice(index, index + maxBatchSize));
    }

    let sent = 0;
    let failed = 0;

    for (const batch of batches) {
      try {
        const message = {
          tokens: batch,
          notification: {
            title: payload.title,
            body: payload.message,
          },
          data: this.normalizeDataPayload(payload.data || {}),
          android: { priority: 'high' },
          apns: {
            headers: {
              'apns-priority': '10',
            },
          },
        };

        const response = await admin.messaging(app).sendEachForMulticast(message);
        sent += response.successCount || 0;
        failed += response.failureCount || 0;

        if ((response.failureCount || 0) > 0) {
          const errors = response.responses
            .filter((entry) => !entry.success)
            .map((entry) => entry.error?.code)
            .filter(Boolean);

          if (errors.length > 0) {
            logger.warn('Firebase push had failed token deliveries', {
              failureCount: response.failureCount,
              sampleErrors: errors.slice(0, 5),
            });
          }
        }
      } catch (error) {
        failed += batch.length;
        logger.error('Firebase push send failed for batch', error, {
          batchSize: batch.length,
        });
      }
    }

    return {
      provider: 'firebase',
      attempted: tokens.length,
      sent,
      failed,
      skipped: false,
    };
  }

  normalizeDataPayload(data = {}) {
    return Object.entries(data).reduce((accumulator, [key, value]) => {
      if (!key) return accumulator;
      if (value === undefined || value === null) return accumulator;

      accumulator[String(key)] = typeof value === 'string' ? value : JSON.stringify(value);
      return accumulator;
    }, {});
  }
}

module.exports = new PushNotificationService();
