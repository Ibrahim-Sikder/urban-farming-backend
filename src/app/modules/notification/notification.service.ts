// modules/notification/notification.service.ts
import prisma from '../../config/prisma';
import { GetNotificationsQuery, NotificationResponse, PaginatedNotificationsResponse } from './notification.type';

export class NotificationService {

    static async getUserNotifications(
        userId: number,
        query: GetNotificationsQuery
    ): Promise<PaginatedNotificationsResponse> {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = { userId };

        if (query.isRead !== undefined) {
            where.isRead = query.isRead;
        }
        if (query.type) {
            where.type = query.type;
        }

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { userId, isRead: false } }),
        ]);

        return {
            notifications: notifications as NotificationResponse[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            unreadCount,
        };
    }

    static async markAsRead(userId: number, notificationIds: number[]): Promise<{ message: string; count: number }> {
        const result = await prisma.notification.updateMany({
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

    static async markAllAsRead(userId: number, type?: string): Promise<{ message: string; count: number }> {
        const where: any = { userId, isRead: false };
        if (type) {
            where.type = type;
        }

        const result = await prisma.notification.updateMany({
            where,
            data: { isRead: true },
        });

        return {
            message: `${result.count} notification(s) marked as read`,
            count: result.count,
        };
    }

    static async deleteNotification(userId: number, notificationId: number): Promise<{ message: string }> {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        await prisma.notification.delete({
            where: { id: notificationId },
        });

        return { message: 'Notification deleted successfully' };
    }

    static async deleteAllNotifications(userId: number, type?: string): Promise<{ message: string; count: number }> {
        const where: any = { userId };
        if (type) {
            where.type = type;
        }

        const result = await prisma.notification.deleteMany({
            where,
        });

        return {
            message: `${result.count} notification(s) deleted`,
            count: result.count,
        };
    }

    static async getUnreadCount(userId: number): Promise<{ unreadCount: number }> {
        const count = await prisma.notification.count({
            where: { userId, isRead: false },
        });

        return { unreadCount: count };
    }

    static async createNotification(
        userId: number,
        title: string,
        message: string,
        type: string,
        metadata?: any
    ): Promise<NotificationResponse> {
        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                metadata: metadata || null,
            },
        });

        return notification as NotificationResponse;
    }
}