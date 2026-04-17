"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userPlantQuerySchema = exports.userRentalQuerySchema = exports.userOrderQuerySchema = void 0;
const zod_1 = require("zod");
exports.userOrderQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        limit: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
        status: zod_1.z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
    }),
});
exports.userRentalQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        limit: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
        status: zod_1.z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
    }),
});
exports.userPlantQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        limit: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
        healthStatus: zod_1.z.enum(['HEALTHY', 'MODERATE', 'CRITICAL', 'HARVEST_READY']).optional(),
        growthStage: zod_1.z.enum(['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'HARVESTING']).optional(),
    }),
});
//# sourceMappingURL=user.validation.js.map