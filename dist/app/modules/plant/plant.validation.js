"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plantQuerySchema = exports.updateHealthStatusSchema = exports.updatePlantSchema = exports.createPlantSchema = void 0;
const zod_1 = require("zod");
exports.createPlantSchema = zod_1.z.object({
    body: zod_1.z.object({
        plantName: zod_1.z.string().min(1).max(100),
        plantType: zod_1.z.string().min(1).max(50),
        plantedDate: zod_1.z.string().datetime(),
        expectedHarvestDate: zod_1.z.string().datetime(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.updatePlantSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/),
    }),
    body: zod_1.z.object({
        plantName: zod_1.z.string().min(1).max(100).optional(),
        plantType: zod_1.z.string().min(1).max(50).optional(),
        expectedHarvestDate: zod_1.z.string().datetime().optional(),
        healthStatus: zod_1.z.enum(['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY']).optional(),
        growthStage: zod_1.z.enum(['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING']).optional(),
        notes: zod_1.z.string().optional(),
    }),
});
exports.updateHealthStatusSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/),
    }),
    body: zod_1.z.object({
        healthStatus: zod_1.z.enum(['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY']),
        growthStage: zod_1.z.enum(['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING']),
        notes: zod_1.z.string().optional(),
    }),
});
exports.plantQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).optional(),
        limit: zod_1.z.string().regex(/^\d+$/).optional(),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
        searchTerm: zod_1.z.string().optional(),
        healthStatus: zod_1.z.enum(['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY']).optional(),
        growthStage: zod_1.z.enum(['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING']).optional(),
        plantType: zod_1.z.string().optional(),
        minDaysOld: zod_1.z.string().regex(/^\d+$/).optional(),
        maxDaysOld: zod_1.z.string().regex(/^\d+$/).optional(),
    }),
});
//# sourceMappingURL=plant.validation.js.map