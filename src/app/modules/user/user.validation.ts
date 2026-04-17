import { z } from 'zod';

export const userOrderQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().transform(Number),
        limit: z.string().regex(/^\d+$/).optional().transform(Number),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
    }),
});

export const userRentalQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().transform(Number),
        limit: z.string().regex(/^\d+$/).optional().transform(Number),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
    }),
});

export const userPlantQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().transform(Number),
        limit: z.string().regex(/^\d+$/).optional().transform(Number),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        healthStatus: z.enum(['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY']).optional(),
        growthStage: z.enum(['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING']).optional(),
    }),
});