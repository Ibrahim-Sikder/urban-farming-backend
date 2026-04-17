import { Response } from 'express';
import { NotificationService } from './notification.service';
import { AuthRequest } from '../../shared/middleware/auth';
import { ResponseHandler } from '../../shared/utils/response';

export class NotificationController {

    static async getUserNotifications(req: AuthRequest, res: Response): Promise<void> {
        try {
            const query = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
                type: req.query.type as string,
            };
            const result = await NotificationService.getUserNotifications(req.user!.id, query);
            ResponseHandler.success(res, result, 'Notifications fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getRecentNotifications(req: AuthRequest, res: Response): Promise<void> {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const notifications = await NotificationService.getRecentNotifications(req.user!.id, limit);
            ResponseHandler.success(res, notifications, 'Recent notifications fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getNotificationsByType(req: AuthRequest, res: Response): Promise<void> {
        try {
            const type = req.params.type;
            const query = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
            };
            const result = await NotificationService.getNotificationsByType(req.user!.id, type, query);
            ResponseHandler.success(res, result, `${type} notifications fetched successfully`);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async markAsRead(req: AuthRequest, res: Response): Promise<void> {
        try {
            const result = await NotificationService.markAsRead(req.user!.id, req.body.notificationIds);
            ResponseHandler.success(res, result, result.message);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
        try {
            const result = await NotificationService.markAllAsRead(req.user!.id, req.body.type);
            ResponseHandler.success(res, result, result.message);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async deleteNotification(req: AuthRequest, res: Response): Promise<void> {
        try {
            const notificationId = parseInt(req.params.id);
            const result = await NotificationService.deleteNotification(req.user!.id, notificationId);
            ResponseHandler.success(res, result, 'Notification deleted successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async deleteAllNotifications(req: AuthRequest, res: Response): Promise<void> {
        try {
            const type = req.query.type as string;
            const result = await NotificationService.deleteAllNotifications(req.user!.id, type);
            ResponseHandler.success(res, result, result.message);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
        try {
            const result = await NotificationService.getUnreadCount(req.user!.id);
            ResponseHandler.success(res, result, 'Unread count fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getNotificationStats(req: AuthRequest, res: Response): Promise<void> {
        try {
            const stats = await NotificationService.getNotificationStats(req.user!.id);
            ResponseHandler.success(res, stats, 'Notification statistics fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}