const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const GuestPushToken = require('../models/GuestPushToken');
const User = require('../models/User');
const pushNotificationService = require('./pushNotificationService');
const Logger = require('../utils/logger');
const { env } = require('../config/env');

const logger = new Logger('NotificationService');

class NotificationService {
  buildUserQuery(filters = {}) {
    const query = {};

    if (filters.plan) query.plan = filters.plan;
    if (filters.role) query.role = filters.role;
    if (filters.universityId) query.universityId = filters.universityId;
    if (filters.isActive !== undefined) query.isActive = Boolean(filters.isActive);

    return query;
  }

  async sendToUsers({
    userIds = [],
    title,
    message,
    type = 'general',
    channels = ['in_app'],
    data = {},
    createdBy = null,
    expiresAt = null,
  }) {
    const normalizedIds = (userIds || [])
      .filter(Boolean)
      .map((id) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)));

    if (normalizedIds.length === 0) {
      return {
        recipients: 0,
        inApp: { created: 0 },
        push: { attempted: 0, sent: 0, failed: 0, skipped: true, reason: 'No recipients' },
      };
    }

    const includeInApp = channels.includes('in_app');
    const includePush = channels.includes('push');

    let createdNotifications = 0;
    if (includeInApp) {
      const docs = normalizedIds.map((userId) => ({
        user: userId,
        title,
        message,
        type,
        channels,
        data,
        createdBy,
        expiresAt,
      }));

      const inserted = await Notification.insertMany(docs, { ordered: false });
      createdNotifications = inserted.length;
    }

    let pushResult = {
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: 'Push not requested',
    };

    if (includePush) {
      const users = await User.find({ _id: { $in: normalizedIds } }).select('pushTokens');
      const tokens = users
        .flatMap((user) => user.pushTokens || [])
        .filter((pushToken) => {
          if (typeof pushToken === 'string') return true;
          return pushToken?.isActive !== false;
        })
        .map((pushToken) => (typeof pushToken === 'string' ? pushToken : pushToken?.token))
        .filter(Boolean);

      pushResult = await pushNotificationService.sendToTokens(tokens, {
        title,
        message,
        data,
      });
    }

    return {
      recipients: normalizedIds.length,
      inApp: { created: createdNotifications },
      push: pushResult,
    };
  }

  async broadcast({
    title,
    message,
    type = 'general',
    channels = ['in_app'],
    filters = {},
    data = {},
    createdBy = null,
    expiresAt = null,
  }) {
    const query = this.buildUserQuery(filters);
    const recipients = await User.find(query).select('_id');

    if (recipients.length === 0) {
      return {
        recipients: 0,
        inApp: { created: 0 },
        push: { attempted: 0, sent: 0, failed: 0, skipped: true, reason: 'No recipients found' },
      };
    }

    const result = await this.sendToUsers({
      userIds: recipients.map((user) => user._id),
      title,
      message,
      type,
      channels,
      data,
      createdBy,
      expiresAt,
    });

    logger.info(`Notification broadcast completed for ${result.recipients} users`, {
      type,
      channels,
    });

    return result;
  }

  async registerPushToken({ userId, token, platform = 'unknown', deviceId = null }) {
    const normalizedToken = (token || '').trim();

    if (!normalizedToken) {
      return { registered: false, reason: 'No token provided' };
    }

    await User.updateOne(
      { _id: userId },
      {
        $pull: { pushTokens: { token: normalizedToken } },
      }
    );

    await User.updateOne(
      { _id: userId },
      {
        $push: {
          pushTokens: {
            token: normalizedToken,
            platform,
            deviceId,
            isActive: true,
            lastSeenAt: new Date(),
            createdAt: new Date(),
          },
        },
      }
    );

    await GuestPushToken.deleteMany({ token: normalizedToken });

    return { registered: true };
  }

  async registerGuestPushToken({ token, platform = 'unknown', deviceId = null, ipAddress = null, userAgent = null }) {
    const normalizedToken = (token || '').trim();

    if (!normalizedToken) {
      return { registered: false, reason: 'No token provided' };
    }

    const ttlDays = Math.max(1, Math.min(parseInt(env.GUEST_PUSH_TOKEN_TTL_DAYS, 10) || 30, 90));
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const guestToken = await GuestPushToken.findOneAndUpdate(
      { token: normalizedToken },
      {
        $set: {
          platform,
          deviceId,
          ipAddress,
          userAgent,
          consentGiven: true,
          claimedBy: null,
          claimedAt: null,
          lastSeenAt: new Date(),
          expiresAt,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return {
      registered: true,
      guestTokenId: guestToken._id,
      expiresAt: guestToken.expiresAt,
    };
  }

  async claimGuestPushToken({ userId, guestTokenId }) {
    if (!guestTokenId) {
      return { registered: false, reason: 'No guest token id provided' };
    }

    const guestToken = await GuestPushToken.findById(guestTokenId);
    if (!guestToken) {
      return { registered: false, reason: 'Guest token not found' };
    }

    if (guestToken.expiresAt && guestToken.expiresAt.getTime() <= Date.now()) {
      return { registered: false, reason: 'Guest token expired' };
    }

    const registerResult = await this.registerPushToken({
      userId,
      token: guestToken.token,
      platform: guestToken.platform || 'unknown',
      deviceId: guestToken.deviceId || null,
    });

    if (!registerResult.registered) {
      return registerResult;
    }

    await GuestPushToken.updateOne(
      { _id: guestToken._id },
      {
        $set: {
          claimedBy: userId,
          claimedAt: new Date(),
        },
      }
    );

    return {
      registered: true,
      token: guestToken.token,
    };
  }

  async unregisterPushToken({ userId, token }) {
    const normalizedToken = (token || '').trim();

    if (!normalizedToken) {
      return { removed: false };
    }

    const result = await User.updateOne(
      { _id: userId },
      {
        $pull: { pushTokens: { token: normalizedToken } },
      }
    );

    return { removed: result.modifiedCount > 0 };
  }

  async unregisterGuestPushToken({ token = null, guestTokenId = null }) {
    const normalizedToken = (token || '').trim();

    if (!normalizedToken && !guestTokenId) {
      return { removed: false };
    }

    const query = { claimedBy: null };

    if (guestTokenId) {
      query._id = guestTokenId;
    } else {
      query.token = normalizedToken;
    }

    const result = await GuestPushToken.deleteOne(query);
    return { removed: result.deletedCount > 0 };
  }

  async listForUser({ userId, page = 1, limit = env.NOTIFICATIONS_DEFAULT_PAGE_SIZE || 20, unreadOnly = false, type }) {
    const normalizedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, env.NOTIFICATIONS_MAX_PAGE_SIZE || 100));
    const normalizedPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (normalizedPage - 1) * normalizedLimit;

    const query = {
      user: userId,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    };

    if (unreadOnly) {
      query.isRead = false;
    }

    if (type) {
      query.type = type;
    }

    const [total, notifications] = await Promise.all([
      Notification.countDocuments(query),
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(normalizedLimit),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page: normalizedPage,
        limit: normalizedLimit,
        pages: Math.ceil(total / normalizedLimit),
      },
    };
  }

  async getUnreadCount(userId) {
    const count = await Notification.countDocuments({
      user: userId,
      isRead: false,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });

    return count;
  }

  async markAsRead({ userId, notificationId }) {
    const updated = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        user: userId,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true }
    );

    return updated;
  }

  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      {
        user: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return result.modifiedCount || 0;
  }
}

module.exports = new NotificationService();
