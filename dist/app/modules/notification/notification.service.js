"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
const prisma_query_builder_1 = require("../../shared/utils/prisma-query-builder");
class NotificationService {
    static async getUserNotifications(userId, query) {
        const cacheKey = `notifications:user:${userId}:${JSON.stringify(query)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('Notification', query);
        const userCondition = client_1.Prisma.sql `"userId" = ${userId}`;
        queryBuilder.addCustomCondition(userCondition);
        if (query.isRead !== undefined) {
            const readCondition = client_1.Prisma.sql `"isRead" = ${query.isRead}`;
            queryBuilder.addCustomCondition(readCondition);
        }
        if (query.type) {
            const typeCondition = client_1.Prisma.sql `type = ${query.type}`;
            queryBuilder.addCustomCondition(typeCondition);
        }
        const customQuery = client_1.Prisma.sql `
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
        const result = await queryBuilder.execute(customQuery);
        const unreadCount = await prisma_1.default.$queryRaw `
            SELECT COUNT(*) as count
            FROM "Notification"
            WHERE "userId" = ${userId} AND "isRead" = false
        `;
        const response = {
            notifications: result.data,
            meta: result.meta,
            unreadCount: Number(unreadCount[0]?.count) || 0,
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 60);
        return response;
    }
    static async markAsRead(userId, notificationIds) {
        const result = await prisma_1.default.$executeRaw `
            UPDATE "Notification"
            SET "isRead" = true
            WHERE id = ANY(${notificationIds}::int[])
            AND "userId" = ${userId}
            AND "isRead" = false
        `;
        await redis_cache_service_1.default.delPattern(`notifications:user:${userId}:*`);
        await redis_cache_service_1.default.del(`notifications:unread:${userId}`);
        return {
            message: `${result} notification(s) marked as read`,
            count: result,
        };
    }
    static async markAllAsRead(userId, type) {
        let whereClause = `"userId" = ${userId} AND "isRead" = false`;
        if (type) {
            whereClause += ` AND type = '${type}'`;
        }
        const result = await prisma_1.default.$executeRaw `
            UPDATE "Notification"
            SET "isRead" = true
            WHERE ${client_1.Prisma.raw(whereClause)}
        `;
        await redis_cache_service_1.default.delPattern(`notifications:user:${userId}:*`);
        await redis_cache_service_1.default.del(`notifications:unread:${userId}`);
        return {
            message: `${result} notification(s) marked as read`,
            count: result,
        };
    }
    static async deleteNotification(userId, notificationId) {
        const existing = await prisma_1.default.$queryRaw `
            SELECT id FROM "Notification"
            WHERE id = ${notificationId} AND "userId" = ${userId}
            LIMIT 1
        `;
        if (!existing || existing.length === 0) {
            throw new Error('Notification not found');
        }
        await prisma_1.default.$executeRaw `
            DELETE FROM "Notification"
            WHERE id = ${notificationId} AND "userId" = ${userId}
        `;
        await Promise.all([
            redis_cache_service_1.default.delPattern(`notifications:user:${userId}:*`),
            redis_cache_service_1.default.del(`notifications:unread:${userId}`)
        ]);
        return { message: 'Notification deleted successfully' };
    }
    static async deleteAllNotifications(userId, type) {
        let whereClause = `"userId" = ${userId}`;
        if (type) {
            whereClause += ` AND type = '${type}'`;
        }
        const result = await prisma_1.default.$executeRaw `
            DELETE FROM "Notification"
            WHERE ${client_1.Prisma.raw(whereClause)}
        `;
        await Promise.all([
            redis_cache_service_1.default.delPattern(`notifications:user:${userId}:*`),
            redis_cache_service_1.default.del(`notifications:unread:${userId}`)
        ]);
        return {
            message: `${result} notification(s) deleted`,
            count: result,
        };
    }
    static async getUnreadCount(userId) {
        const cacheKey = `notifications:unread:${userId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const result = await prisma_1.default.$queryRaw `
            SELECT COUNT(*) as count
            FROM "Notification"
            WHERE "userId" = ${userId} AND "isRead" = false
        `;
        const response = {
            unreadCount: Number(result[0]?.count) || 0,
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 30);
        return response;
    }
    static async createNotification(userId, title, message, type, metadata) {
        const notification = await prisma_1.default.$queryRaw `
            INSERT INTO "Notification" ("userId", title, message, type, "isRead", metadata, "createdAt", "updatedAt")
            VALUES (${userId}, ${title}, ${message}, ${type}, false, ${metadata || null}, NOW(), NOW())
            RETURNING id, "userId", title, message, type, "isRead", metadata, "createdAt"
        `;
        await Promise.all([
            redis_cache_service_1.default.delPattern(`notifications:user:${userId}:*`),
            redis_cache_service_1.default.del(`notifications:unread:${userId}`)
        ]);
        return notification[0];
    }
    static async createBulkNotifications(userIds, title, message, type, metadata) {
        let insertedCount = 0;
        for (const userId of userIds) {
            await prisma_1.default.$executeRaw `
                INSERT INTO "Notification" ("userId", title, message, type, "isRead", metadata, "createdAt", "updatedAt")
                VALUES (${userId}, ${title}, ${message}, ${type}, false, ${metadata || null}, NOW(), NOW())
            `;
            insertedCount++;
        }
        for (const userId of userIds) {
            await Promise.all([
                redis_cache_service_1.default.delPattern(`notifications:user:${userId}:*`),
                redis_cache_service_1.default.del(`notifications:unread:${userId}`)
            ]);
        }
        return {
            message: `${insertedCount} notification(s) created`,
            count: insertedCount,
        };
    }
    static async getNotificationsByType(userId, type, query = {}) {
        const cacheKey = `notifications:user:${userId}:type:${type}:${JSON.stringify(query)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const queryWithType = { ...query, type };
        const result = await this.getUserNotifications(userId, queryWithType);
        await redis_cache_service_1.default.setFast(cacheKey, result, 60);
        return result;
    }
    static async getRecentNotifications(userId, limit = 10) {
        const cacheKey = `notifications:user:${userId}:recent:${limit}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const notifications = await prisma_1.default.$queryRaw `
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
        await redis_cache_service_1.default.setFast(cacheKey, notifications, 30);
        return notifications;
    }
    static async cleanOldNotifications(daysOld = 30) {
        const result = await prisma_1.default.$executeRaw `
            DELETE FROM "Notification"
            WHERE "createdAt" < NOW() - INTERVAL '${daysOld} days'
            AND "isRead" = true
        `;
        await redis_cache_service_1.default.delPattern('notifications:*');
        return {
            message: `${result} old notification(s) cleaned up`,
            count: result,
        };
    }
    static async getNotificationStats(userId) {
        const cacheKey = `notifications:stats:${userId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const stats = await prisma_1.default.$queryRaw `
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
        await redis_cache_service_1.default.setFast(cacheKey, response, 300);
        return response;
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map