import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import {
    getNotificationsSchema,
    markAsReadSchema,
    markAllAsReadSchema,
    getNotificationsByTypeSchema
} from './notification.validation';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', validate(getNotificationsSchema), NotificationController.getUserNotifications);
router.get('/recent', NotificationController.getRecentNotifications);
router.get('/unread/count', NotificationController.getUnreadCount);
router.get('/stats', NotificationController.getNotificationStats);
router.get('/type/:type', validate(getNotificationsByTypeSchema), NotificationController.getNotificationsByType);
router.patch('/mark-read', validate(markAsReadSchema), NotificationController.markAsRead);
router.patch('/mark-all-read', validate(markAllAsReadSchema), NotificationController.markAllAsRead);

router.delete('/:id', NotificationController.deleteNotification);
router.delete('/', NotificationController.deleteAllNotifications);

export const notificationRoutes = router;