// modules/plant/plant.validation.ts
import { z } from 'zod';

export const createPlantSchema = z.object({
    body: z.object({
        plantName: z.string().min(2, 'Plant name must be at least 2 characters').max(100),
        plantType: z.string().min(2, 'Plant type is required'),
        plantedDate: z.string().datetime().transform(d => new Date(d)),
        expectedHarvestDate: z.string().datetime().transform(d => new Date(d)),
        notes: z.string().optional(),
    }).refine(data => data.plantedDate < data.expectedHarvestDate, {
        message: 'Expected harvest date must be after planted date',
        path: ['expectedHarvestDate'],
    }),
});

export const updatePlantSchema = z.object({
    body: z.object({
        plantName: z.string().min(2).optional(),
        plantType: z.string().optional(),
        expectedHarvestDate: z.string().datetime().transform(d => new Date(d)).optional(),
        healthStatus: z.enum(['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY']).optional(),
        growthStage: z.enum(['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING']).optional(),
        notes: z.string().optional(),
    }),
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid plant ID'),
    }),
});

export const updateHealthStatusSchema = z.object({
    body: z.object({
        healthStatus: z.enum(['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY']),
        growthStage: z.enum(['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING']),
        notes: z.string().optional(),
    }),
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid plant ID'),
    }),
});