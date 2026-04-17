// modules/notification/notification.controller.ts
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
                isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
                type: req.query.type as string,
            };
            const result = await NotificationService.getUserNotifications(req.user!.id, query);
            ResponseHandler.success(res, result, 'Notifications fetched successfully');
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
}