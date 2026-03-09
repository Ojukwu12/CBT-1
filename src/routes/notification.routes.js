const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { guestPushTokenLimiter } = require('../middleware/rateLimit.middleware');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.post('/guest/push-token', guestPushTokenLimiter, validate(notificationController.registerGuestPushTokenSchema), notificationController.registerGuestPushToken);
router.delete('/guest/push-token', guestPushTokenLimiter, validate(notificationController.unregisterGuestPushTokenSchema), notificationController.unregisterGuestPushToken);

router.use(verifyToken);

router.get('/', validate(notificationController.notificationListQuerySchema, 'query'), notificationController.listNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllNotificationsAsRead);
router.patch('/:notificationId/read', validate(notificationController.markNotificationParamsSchema, 'params'), notificationController.markNotificationAsRead);
router.post('/push-token', validate(notificationController.registerPushTokenSchema), notificationController.registerPushToken);
router.delete('/push-token', validate(notificationController.unregisterPushTokenSchema), notificationController.unregisterPushToken);

module.exports = router;
