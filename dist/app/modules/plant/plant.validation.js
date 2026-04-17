"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHealthStatusSchema = exports.updatePlantSchema = exports.createPlantSchema = void 0;
const zod_1 = require("zod");
exports.createPlantSchema = zod_1.z.object({
    body: zod_1.z.object({
        plantName: zod_1.z.string().min(2, 'Plant name must be at least 2 characters').max(100),
        plantType: zod_1.z.string().min(2, 'Plant type is required'),
        plantedDate: zod_1.z.string().datetime().transform(d => new Date(d)),
        expectedHarvestDate: zod_1.z.string().datetime().transform(d => new Date(d)),
        notes: zod_1.z.string().optional(),
    }).refine(data => data.plantedDate < data.expectedHarvestDate, {
        message: 'Expected harvest date must be after planted date',
        path: ['expectedHarvestDate'],
    }),
});
exports.updatePlantSchema = zod_1.z.object({
    body: zod_1.z.object({
        plantName: zod_1.z.string().min(2).optional(),
        plantType: zod_1.z.string().optional(),
        expectedHarvestDate: zod_1.z.string().datetime().transform(d => new Date(d)).optional(),
        healthStatus: zod_1.z.enum(['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY']).optional(),
        growthStage: zod_1.z.enum(['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING']).optional(),
        notes: zod_1.z.string().optional(),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid plant ID'),
    }),
});
exports.updateHealthStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        healthStatus: zod_1.z.enum(['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY']),
        growthStage: zod_1.z.enum(['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING']),
        notes: zod_1.z.string().optional(),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid plant ID'),
    }),
});
//# sourceMappingURL=plant.validation.js.map