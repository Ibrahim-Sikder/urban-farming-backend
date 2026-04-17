// modules/notification/notification.routes.ts
import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import { getNotificationsSchema, markAsReadSchema, markAllAsReadSchema } from './notification.validation';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', validate(getNotificationsSchema), NotificationController.getUserNotifications);
router.get('/unread/count', NotificationController.getUnreadCount);
router.patch('/mark-read', validate(markAsReadSchema), NotificationController.markAsRead);
router.patch('/mark-all-read', validate(markAllAsReadSchema), NotificationController.markAllAsRead);
router.delete('/:id', NotificationController.deleteNotification);
router.delete('/', NotificationController.deleteAllNotifications);

export const notificationRoutes = router;