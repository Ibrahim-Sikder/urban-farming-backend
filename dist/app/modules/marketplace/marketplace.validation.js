"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.produceFiltersSchema = exports.updateOrderStatusSchema = exports.createOrderSchema = exports.updateCartItemSchema = exports.addToCartSchema = exports.updateProduceSchema = exports.createProduceSchema = void 0;
const zod_1 = require("zod");
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
exports.addToCartSchema = zod_1.z.object({
    body: zod_1.z.object({
        produceId: zod_1.z.number().int().positive('Produce ID is required'),
        quantity: zod_1.z.number().int().positive('Quantity must be positive'),
    }),
});
exports.updateCartItemSchema = zod_1.z.object({
    body: zod_1.z.object({
        quantity: zod_1.z.number().int().positive('Quantity must be positive'),
    }),
    params: zod_1.z.object({
        itemId: zod_1.z.string().regex(/^\d+$/, 'Invalid cart item ID'),
    }),
});
exports.createOrderSchema = zod_1.z.object({
    body: zod_1.z.object({
        produceId: zod_1.z.number().int().positive(),
        quantity: zod_1.z.number().int().positive(),
        vendorId: zod_1.z.number().int().positive(),
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
exports.produceFiltersSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        limit: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        category: zod_1.z.string().optional(),
        certificationStatus: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
        minPrice: zod_1.z.string().regex(/^\d+(\.\d+)?$/).optional().transform(Number),
        maxPrice: zod_1.z.string().regex(/^\d+(\.\d+)?$/).optional().transform(Number),
        search: zod_1.z.string().optional(),
        vendorId: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
    }),
});
//# sourceMappingURL=marketplace.validation.js.map