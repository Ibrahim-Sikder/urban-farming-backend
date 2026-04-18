import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import { PrismaQueryBuilder } from '../../shared/utils/prisma-query-builder';
import {
    BulkOperationResponse,
    GetNotificationsQuery,
    MessageResponse,
    NotificationResponse,
    PaginatedNotificationsResponse,
    UnreadCountResponse
} from './notification.type';

export class NotificationService {
    static async getUserNotifications(
        userId: number,
        query: GetNotificationsQuery
    ): Promise<PaginatedNotificationsResponse> {
        const cacheKey = `notifications:user:${userId}:${JSON.stringify(query)}`;
        const cached = await RedisCacheService.getFast<PaginatedNotificationsResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const queryBuilder = new PrismaQueryBuilder('Notification', query as any);
        const userCondition = Prisma.sql`"userId" = ${userId}`;
        queryBuilder.addCustomCondition(userCondition);
        if (query.isRead !== undefined) {
            const readCondition = Prisma.sql`"isRead" = ${query.isRead}`;
            queryBuilder.addCustomCondition(readCondition);
        }

        if (query.type) {
            const typeCondition = Prisma.sql`type = ${query.type}`;
            queryBuilder.addCustomCondition(typeCondition);
        }
        const customQuery = Prisma.sql`
            SELECT 
                id,
                "userId",
                title,
                message,
                type,
                "isRead",
                metadata,
                "createdAt"
            FROM "Notification"
        `;

        const result = await queryBuilder.execute<NotificationResponse>(customQuery);
        const unreadCount = await prisma.$queryRaw<{ count: number }[]>`
            SELECT COUNT(*) as count
            FROM "Notification"
            WHERE "userId" = ${userId} AND "isRead" = false
        `;

        const response: PaginatedNotificationsResponse = {
            notifications: result.data,
            meta: result.meta,
            unreadCount: Number(unreadCount[0]?.count) || 0,
        };
        await RedisCacheService.setFast(cacheKey, response, 60);

        return response;
    }

    static async markAsRead(userId: number, notificationIds: number[]): Promise<BulkOperationResponse> {
        const result = await prisma.$executeRaw`
            UPDATE "Notification"
            SET "isRead" = true
            WHERE id = ANY(${notificationIds}::int[])
            AND "userId" = ${userId}
            AND "isRead" = false
        `;
        await RedisCacheService.delPattern(`notifications:user:${userId}:*`);

        await RedisCacheService.del(`notifications:unread:${userId}`);

        return {
            message: `${result} notification(s) marked as read`,
            count: result,
        };
    }

    static async markAllAsRead(userId: number, type?: string): Promise<BulkOperationResponse> {
        let whereClause = `"userId" = ${userId} AND "isRead" = false`;
        if (type) {
            whereClause += ` AND type = '${type}'`;
        }

        const result = await prisma.$executeRaw`
            UPDATE "Notification"
            SET "isRead" = true
            WHERE ${Prisma.raw(whereClause)}
        `;

        await RedisCacheService.delPattern(`notifications:user:${userId}:*`);
        await RedisCacheService.del(`notifications:unread:${userId}`);

        return {
            message: `${result} notification(s) marked as read`,
            count: result,
        };
    }

    static async deleteNotification(userId: number, notificationId: number): Promise<MessageResponse> {
        const existing = await prisma.$queryRaw<any[]>`
            SELECT id FROM "Notification"
            WHERE id = ${notificationId} AND "userId" = ${userId}
            LIMIT 1
        `;

        if (!existing || existing.length === 0) {
            throw new Error('Notification not found');
        }

        await prisma.$executeRaw`
            DELETE FROM "Notification"
            WHERE id = ${notificationId} AND "userId" = ${userId}
        `;
        await Promise.all([
            RedisCacheService.delPattern(`notifications:user:${userId}:*`),
            RedisCacheService.del(`notifications:unread:${userId}`)
        ]);

        return { message: 'Notification deleted successfully' };
    }

    static async deleteAllNotifications(userId: number, type?: string): Promise<BulkOperationResponse> {
        let whereClause = `"userId" = ${userId}`;
        if (type) {
            whereClause += ` AND type = '${type}'`;
        }

        const result = await prisma.$executeRaw`
            DELETE FROM "Notification"
            WHERE ${Prisma.raw(whereClause)}
        `;

        await Promise.all([
            RedisCacheService.delPattern(`notifications:user:${userId}:*`),
            RedisCacheService.del(`notifications:unread:${userId}`)
        ]);

        return {
            message: `${result} notification(s) deleted`,
            count: result,
        };
    }

    static async getUnreadCount(userId: number): Promise<UnreadCountResponse> {
        const cacheKey = `notifications:unread:${userId}`;

        const cached = await RedisCacheService.getFast<UnreadCountResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const result = await prisma.$queryRaw<{ count: number }[]>`
            SELECT COUNT(*) as count
            FROM "Notification"
            WHERE "userId" = ${userId} AND "isRead" = false
        `;

        const response: UnreadCountResponse = {
            unreadCount: Number(result[0]?.count) || 0,
        };
        await RedisCacheService.setFast(cacheKey, response, 30);

        return response;
    }
    static async createNotification(
        userId: number,
        title: string,
        message: string,
        type: string,
        metadata?: any
    ): Promise<NotificationResponse> {
        const notification = await prisma.$queryRaw<NotificationResponse[]>`
            INSERT INTO "Notification" ("userId", title, message, type, "isRead", metadata, "createdAt", "updatedAt")
            VALUES (${userId}, ${title}, ${message}, ${type}, false, ${metadata || null}, NOW(), NOW())
            RETURNING id, "userId", title, message, type, "isRead", metadata, "createdAt"
        `;
        await Promise.all([
            RedisCacheService.delPattern(`notifications:user:${userId}:*`),
            RedisCacheService.del(`notifications:unread:${userId}`)
        ]);

        return notification[0];
    }

    static async createBulkNotifications(
        userIds: number[],
        title: string,
        message: string,
        type: string,
        metadata?: any
    ): Promise<BulkOperationResponse> {
        let insertedCount = 0;

        for (const userId of userIds) {
            await prisma.$executeRaw`
                INSERT INTO "Notification" ("userId", title, message, type, "isRead", metadata, "createdAt", "updatedAt")
                VALUES (${userId}, ${title}, ${message}, ${type}, false, ${metadata || null}, NOW(), NOW())
            `;
            insertedCount++;
        }
        for (const userId of userIds) {
            await Promise.all([
                RedisCacheService.delPattern(`notifications:user:${userId}:*`),
                RedisCacheService.del(`notifications:unread:${userId}`)
            ]);
        }

        return {
            message: `${insertedCount} notification(s) created`,
            count: insertedCount,
        };
    }
    static async getNotificationsByType(
        userId: number,
        type: string,
        query: GetNotificationsQuery = {}
    ): Promise<PaginatedNotificationsResponse> {
        const cacheKey = `notifications:user:${userId}:type:${type}:${JSON.stringify(query)}`;

        const cached = await RedisCacheService.getFast<PaginatedNotificationsResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const queryWithType = { ...query, type };
        const result = await this.getUserNotifications(userId, queryWithType);

        await RedisCacheService.setFast(cacheKey, result, 60);

        return result;
    }

    static async getRecentNotifications(
        userId: number,
        limit: number = 10
    ): Promise<NotificationResponse[]> {
        const cacheKey = `notifications:user:${userId}:recent:${limit}`;

        const cached = await RedisCacheService.getFast<NotificationResponse[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const notifications = await prisma.$queryRaw<NotificationResponse[]>`
            SELECT 
                id,
                "userId",
                title,
                message,
                type,
                "isRead",
                metadata,
                "createdAt"
            FROM "Notification"
            WHERE "userId" = ${userId}
            ORDER BY "createdAt" DESC
            LIMIT ${limit}
        `;

        await RedisCacheService.setFast(cacheKey, notifications, 30);

        return notifications;
    }

    static async cleanOldNotifications(daysOld: number = 30): Promise<BulkOperationResponse> {
        const result = await prisma.$executeRaw`
            DELETE FROM "Notification"
            WHERE "createdAt" < NOW() - INTERVAL '${daysOld} days'
            AND "isRead" = true
        `;
        await RedisCacheService.delPattern('notifications:*');

        return {
            message: `${result} old notification(s) cleaned up`,
            count: result,
        };
    }


    static async getNotificationStats(userId: number): Promise<any> {
        const cacheKey = `notifications:stats:${userId}`;

        const cached = await RedisCacheService.getFast<any>(cacheKey);
        if (cached) {
            return cached;
        }

        const stats = await prisma.$queryRaw<any[]>`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN "isRead" = false THEN 1 END) as unread,
                COUNT(CASE WHEN type = 'ORDER' THEN 1 END) as order_notifications,
                COUNT(CASE WHEN type = 'RENTAL' THEN 1 END) as rental_notifications,
                COUNT(CASE WHEN type = 'PLANT' THEN 1 END) as plant_notifications,
                COUNT(CASE WHEN type = 'CERTIFICATION' THEN 1 END) as certification_notifications,
                COUNT(CASE WHEN type = 'SYSTEM' THEN 1 END) as system_notifications
            FROM "Notification"
            WHERE "userId" = ${userId}
        `;

        const result = stats[0] || {};
        const response = {
            total: Number(result.total) || 0,
            unread: Number(result.unread) || 0,
            byType: {
                order: Number(result.order_notifications) || 0,
                rental: Number(result.rental_notifications) || 0,
                plant: Number(result.plant_notifications) || 0,
                certification: Number(result.certification_notifications) || 0,
                system: Number(result.system_notifications) || 0,
            }
        };

        await RedisCacheService.setFast(cacheKey, response, 300);

        return response;
    }
}