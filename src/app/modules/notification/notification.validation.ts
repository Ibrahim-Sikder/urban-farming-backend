// modules/notification/notification.validation.ts
import { z } from 'zod';

export const getNotificationsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().transform(Number),
        limit: z.string().regex(/^\d+$/).optional().transform(Number),
        isRead: z.string().transform(val => val === 'true').optional(),
        type: z.string().optional(),
    }),
});

export const markAsReadSchema = z.object({
    body: z.object({
        notificationIds: z.array(z.number().int().positive()).min(1, 'At least one notification ID is required'),
    }),
});

export const markAllAsReadSchema = z.object({
    body: z.object({
        type: z.string().optional(),
    }),
});