"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notification_service_1 = require("./notification.service");
const response_1 = require("../../shared/utils/response");
class NotificationController {
    static async getUserNotifications(req, res) {
        try {
            const query = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 20,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
                type: req.query.type,
            };
            const result = await notification_service_1.NotificationService.getUserNotifications(req.user.id, query);
            response_1.ResponseHandler.success(res, result, 'Notifications fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getRecentNotifications(req, res) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const notifications = await notification_service_1.NotificationService.getRecentNotifications(req.user.id, limit);
            response_1.ResponseHandler.success(res, notifications, 'Recent notifications fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getNotificationsByType(req, res) {
        try {
            const type = req.params.type;
            const query = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 20,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
            };
            const result = await notification_service_1.NotificationService.getNotificationsByType(req.user.id, type, query);
            response_1.ResponseHandler.success(res, result, `${type} notifications fetched successfully`);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async markAsRead(req, res) {
        try {
            const result = await notification_service_1.NotificationService.markAsRead(req.user.id, req.body.notificationIds);
            response_1.ResponseHandler.success(res, result, result.message);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async markAllAsRead(req, res) {
        try {
            const result = await notification_service_1.NotificationService.markAllAsRead(req.user.id, req.body.type);
            response_1.ResponseHandler.success(res, result, result.message);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async deleteNotification(req, res) {
        try {
            const notificationId = parseInt(req.params.id);
            const result = await notification_service_1.NotificationService.deleteNotification(req.user.id, notificationId);
            response_1.ResponseHandler.success(res, result, 'Notification deleted successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async deleteAllNotifications(req, res) {
        try {
            const type = req.query.type;
            const result = await notification_service_1.NotificationService.deleteAllNotifications(req.user.id, type);
            response_1.ResponseHandler.success(res, result, result.message);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getUnreadCount(req, res) {
        try {
            const result = await notification_service_1.NotificationService.getUnreadCount(req.user.id);
            response_1.ResponseHandler.success(res, result, 'Unread count fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getNotificationStats(req, res) {
        try {
            const stats = await notification_service_1.NotificationService.getNotificationStats(req.user.id);
            response_1.ResponseHandler.success(res, stats, 'Notification statistics fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
}
exports.NotificationController = NotificationController;
//# sourceMappingURL=notification.controller.js.map