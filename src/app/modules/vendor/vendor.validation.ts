import { z } from 'zod';

export const updateVendorProfileSchema = z.object({
    body: z.object({
        farmName: z.string().min(2, 'Farm name must be at least 2 characters').optional(),
        farmLocation: z.string().optional(),
    }),
});

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

export const createRentalSpaceSchema = z.object({
    body: z.object({
        location: z.string().min(2, 'Location is required'),
        size: z.number().positive('Size must be positive'),
        price: z.number().positive('Price must be positive'),
    }),
});

export const updateRentalSpaceSchema = z.object({
    body: z.object({
        location: z.string().optional(),
        size: z.number().positive().optional(),
        price: z.number().positive().optional(),
        availability: z.boolean().optional(),
    }),
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid space ID'),
    }),
});

export const submitCertificationSchema = z.object({
    body: z.object({
        certifyingAgency: z.string().min(2, 'Certifying agency is required'),
        certificationDate: z.string().datetime().transform(d => new Date(d)),
        expiryDate: z.string().datetime().optional().transform(d => d ? new Date(d) : undefined),
        documentUrl: z.string().url().optional(),
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

export const getVendorOrdersSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().transform(Number),
        limit: z.string().regex(/^\d+$/).optional().transform(Number),
        status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
    }),
});