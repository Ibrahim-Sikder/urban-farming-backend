"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRentalSpaceSchema = exports.updateRentalBookingSchema = exports.createRentalBookingSchema = void 0;
const zod_1 = require("zod");
exports.createRentalBookingSchema = zod_1.z.object({
    body: zod_1.z.object({
        spaceId: zod_1.z.number().int().positive('Space ID is required'),
        startDate: zod_1.z.string().datetime().transform(d => new Date(d)),
        endDate: zod_1.z.string().datetime().transform(d => new Date(d)),
    }).refine(data => data.startDate < data.endDate, {
        message: 'End date must be after start date',
        path: ['endDate'],
    }),
});
exports.updateRentalBookingSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
        cancellationReason: zod_1.z.string().optional(),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid booking ID'),
    }),
});
exports.searchRentalSpaceSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        limit: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        location: zod_1.z.string().optional(),
        minSize: zod_1.z.string().regex(/^\d+(\.\d+)?$/).optional().transform(Number),
        maxSize: zod_1.z.string().regex(/^\d+(\.\d+)?$/).optional().transform(Number),
        minPrice: zod_1.z.string().regex(/^\d+(\.\d+)?$/).optional().transform(Number),
        maxPrice: zod_1.z.string().regex(/^\d+(\.\d+)?$/).optional().transform(Number),
        availability: zod_1.z.string().transform(val => val === 'true').optional(),
    }),
});
//# sourceMappingURL=rental.validation.js.map