// modules/rental/rental.validation.ts
import { z } from 'zod';

export const createRentalBookingSchema = z.object({
    body: z.object({
        spaceId: z.number().int().positive('Space ID is required'),
        startDate: z.string().datetime().transform(d => new Date(d)),
        endDate: z.string().datetime().transform(d => new Date(d)),
    }).refine(data => data.startDate < data.endDate, {
        message: 'End date must be after start date',
        path: ['endDate'],
    }),
});

export const updateRentalBookingSchema = z.object({
    body: z.object({
        status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
        cancellationReason: z.string().optional(),
    }),
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid booking ID'),
    }),
});

export const searchRentalSpaceSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().transform(Number),
        limit: z.string().regex(/^\d+$/).optional().transform(Number),
        location: z.string().optional(),
        minSize: z.string().regex(/^\d+(\.\d+)?$/).optional().transform(Number),
        maxSize: z.string().regex(/^\d+(\.\d+)?$/).optional().transform(Number),
        minPrice: z.string().regex(/^\d+(\.\d+)?$/).optional().transform(Number),
        maxPrice: z.string().regex(/^\d+(\.\d+)?$/).optional().transform(Number),
        availability: z.string().transform(val => val === 'true').optional(),
    }),
});