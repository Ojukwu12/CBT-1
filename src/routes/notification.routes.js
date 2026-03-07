const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.use(verifyToken);

router.get('/', validate(notificationController.notificationListQuerySchema, 'query'), notificationController.listNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllNotificationsAsRead);
router.patch('/:notificationId/read', validate(notificationController.markNotificationParamsSchema, 'params'), notificationController.markNotificationAsRead);
router.post('/push-token', validate(notificationController.registerPushTokenSchema), notificationController.registerPushToken);
router.delete('/push-token', validate(notificationController.unregisterPushTokenSchema), notificationController.unregisterPushToken);

module.exports = router;
