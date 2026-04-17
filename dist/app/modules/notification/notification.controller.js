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
}
exports.NotificationController = NotificationController;
//# sourceMappingURL=notification.controller.js.map