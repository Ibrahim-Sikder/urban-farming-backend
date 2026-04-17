import { z } from 'zod';

export const createPlantSchema = z.object({
    body: z.object({
        plantName: z.string().min(1).max(100),
        plantType: z.string().min(1).max(50),
        plantedDate: z.string().datetime(),
        expectedHarvestDate: z.string().datetime(),
        notes: z.string().optional(),
    }),
});

export const updatePlantSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/),
    }),
    body: z.object({
        plantName: z.string().min(1).max(100).optional(),
        plantType: z.string().min(1).max(50).optional(),
        expectedHarvestDate: z.string().datetime().optional(),
        healthStatus: z.enum(['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY']).optional(),
        growthStage: z.enum(['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING']).optional(),
        notes: z.string().optional(),
    }),
});

export const updateHealthStatusSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/),
    }),
    body: z.object({
        healthStatus: z.enum(['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY']),
        growthStage: z.enum(['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING']),
        notes: z.string().optional(),
    }),
});

export const plantQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        searchTerm: z.string().optional(),
        healthStatus: z.enum(['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY']).optional(),
        growthStage: z.enum(['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING']).optional(),
        plantType: z.string().optional(),
        minDaysOld: z.string().regex(/^\d+$/).optional(),
        maxDaysOld: z.string().regex(/^\d+$/).optional(),
    }),
});