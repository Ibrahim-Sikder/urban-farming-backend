import { z } from 'zod';

export const updateUserStatusSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid user ID'),
    }),
    body: z.object({
        status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
    }),
});

export const verifyVendorSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid vendor ID'),
    }),
    body: z.object({
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
        rejectionReason: z.string().optional(),
    }),
});

export const verifyCertificationSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid certification ID'),
    }),
    body: z.object({
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
        verificationNotes: z.string().optional(),
    }),
});

export const approveRentalSpaceSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid space ID'),
    }),
    body: z.object({
        isApproved: z.boolean(),
        rejectionReason: z.string().optional(),
    }),
});

export const moderatePostSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid post ID'),
    }),
    body: z.object({
        isApproved: z.boolean(),
        rejectionReason: z.string().optional(),
    }),
});

export const dashboardFiltersSchema = z.object({
    query: z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
    }),
});