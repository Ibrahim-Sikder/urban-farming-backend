"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
class NotificationService {
    static async getUserNotifications(userId, query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const where = { userId };
        if (query.isRead !== undefined) {
            where.isRead = query.isRead;
        }
        if (query.type) {
            where.type = query.type;
        }
        const [notifications, total, unreadCount] = await Promise.all([
            prisma_1.default.notification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.default.notification.count({ where }),
            prisma_1.default.notification.count({ where: { userId, isRead: false } }),
        ]);
        return {
            notifications: notifications,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            unreadCount,
        };
    }
    static async markAsRead(userId, notificationIds) {
        const result = await prisma_1.default.notification.updateMany({
            where: {
                id: { in: notificationIds },
                userId,
                isRead: false,
            },
            data: { isRead: true },
        });
        return {
            message: `${result.count} notification(s) marked as read`,
            count: result.count,
        };
    }
    static async markAllAsRead(userId, type) {
        const where = { userId, isRead: false };
        if (type) {
            where.type = type;
        }
        const result = await prisma_1.default.notification.updateMany({
            where,
            data: { isRead: true },
        });
        return {
            message: `${result.count} notification(s) marked as read`,
            count: result.count,
        };
    }
    static async deleteNotification(userId, notificationId) {
        const notification = await prisma_1.default.notification.findFirst({
            where: { id: notificationId, userId },
        });
        if (!notification) {
            throw new Error('Notification not found');
        }
        await prisma_1.default.notification.delete({
            where: { id: notificationId },
        });
        return { message: 'Notification deleted successfully' };
    }
    static async deleteAllNotifications(userId, type) {
        const where = { userId };
        if (type) {
            where.type = type;
        }
        const result = await prisma_1.default.notification.deleteMany({
            where,
        });
        return {
            message: `${result.count} notification(s) deleted`,
            count: result.count,
        };
    }
    static async getUnreadCount(userId) {
        const count = await prisma_1.default.notification.count({
            where: { userId, isRead: false },
        });
        return { unreadCount: count };
    }
    static async createNotification(userId, title, message, type, metadata) {
        const notification = await prisma_1.default.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                metadata: metadata || null,
            },
        });
        return notification;
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map