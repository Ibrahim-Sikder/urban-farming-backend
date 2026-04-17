import { z } from 'zod';

export const getNotificationsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().transform(Number),
        limit: z.string().regex(/^\d+$/).optional().transform(Number),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        isRead: z.string().transform(val => val === 'true').optional(),
        type: z.string().optional(),
    }),
});

export const getNotificationsByTypeSchema = z.object({
    params: z.object({
        type: z.string().min(1),
    }),
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().transform(Number),
        limit: z.string().regex(/^\d+$/).optional().transform(Number),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        isRead: z.string().transform(val => val === 'true').optional(),
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