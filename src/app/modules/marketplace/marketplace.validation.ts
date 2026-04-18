import { z } from 'zod';

export const createProduceSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(100),
        description: z.string().min(10, 'Description must be at least 10 characters'),
        price: z.number().positive('Price must be positive'),
        category: z.string().min(2, 'Category is required'),
        availableQuantity: z.number().int().positive('Quantity must be positive'),
    }),
});

export const updateProduceSchema = z.object({
    body: z.object({
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        price: z.number().positive().optional(),
        category: z.string().optional(),
        availableQuantity: z.number().int().positive().optional(),
    }),
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid product ID'),
    }),
});

export const addToCartSchema = z.object({
    body: z.object({
        produceId: z.number().int().positive('Produce ID is required'),
        quantity: z.number().int().positive('Quantity must be positive'),
    }),
});

export const updateCartItemSchema = z.object({
    body: z.object({
        quantity: z.number().int().positive('Quantity must be positive'),
    }),
    params: z.object({
        itemId: z.string().regex(/^\d+$/, 'Invalid cart item ID'),
    }),
});

export const createOrderSchema = z.object({
    body: z.object({
        produceId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        vendorId: z.number().int().positive(),
    }),
});

export const updateOrderStatusSchema = z.object({
    body: z.object({
        status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
    }),
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid order ID'),
    }),
});

export const produceFiltersSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().transform(Number),
        limit: z.string().regex(/^\d+$/).optional().transform(Number),
        category: z.string().optional(),
        certificationStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
        minPrice: z.string().regex(/^\d+(\.\d+)?$/).optional().transform(Number),
        maxPrice: z.string().regex(/^\d+(\.\d+)?$/).optional().transform(Number),
        search: z.string().optional(),
        vendorId: z.string().regex(/^\d+$/).optional().transform(Number),
    }),
});