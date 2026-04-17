"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorOrdersSchema = exports.updateOrderStatusSchema = exports.submitCertificationSchema = exports.updateRentalSpaceSchema = exports.createRentalSpaceSchema = exports.updateProduceSchema = exports.createProduceSchema = exports.updateVendorProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateVendorProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        farmName: zod_1.z.string().min(2, 'Farm name must be at least 2 characters').optional(),
        farmLocation: zod_1.z.string().optional(),
    }),
});
exports.createProduceSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(100),
        description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
        price: zod_1.z.number().positive('Price must be positive'),
        category: zod_1.z.string().min(2, 'Category is required'),
        availableQuantity: zod_1.z.number().int().positive('Quantity must be positive'),
    }),
});
exports.updateProduceSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).optional(),
        description: zod_1.z.string().optional(),
        price: zod_1.z.number().positive().optional(),
        category: zod_1.z.string().optional(),
        availableQuantity: zod_1.z.number().int().positive().optional(),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid product ID'),
    }),
});
exports.createRentalSpaceSchema = zod_1.z.object({
    body: zod_1.z.object({
        location: zod_1.z.string().min(2, 'Location is required'),
        size: zod_1.z.number().positive('Size must be positive'),
        price: zod_1.z.number().positive('Price must be positive'),
    }),
});
exports.updateRentalSpaceSchema = zod_1.z.object({
    body: zod_1.z.object({
        location: zod_1.z.string().optional(),
        size: zod_1.z.number().positive().optional(),
        price: zod_1.z.number().positive().optional(),
        availability: zod_1.z.boolean().optional(),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid space ID'),
    }),
});
exports.submitCertificationSchema = zod_1.z.object({
    body: zod_1.z.object({
        certifyingAgency: zod_1.z.string().min(2, 'Certifying agency is required'),
        certificationDate: zod_1.z.string().datetime().transform(d => new Date(d)),
        expiryDate: zod_1.z.string().datetime().optional().transform(d => d ? new Date(d) : undefined),
        documentUrl: zod_1.z.string().url().optional(),
    }),
});
exports.updateOrderStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid order ID'),
    }),
});
exports.getVendorOrdersSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        limit: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        status: zod_1.z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
    }),
});
//# sourceMappingURL=vendor.validation.js.map