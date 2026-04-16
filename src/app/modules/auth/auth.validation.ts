import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(100),
        email: z.string().email('Invalid email format'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        role: z.enum(['ADMIN', 'VENDOR', 'CUSTOMER']).optional().default('CUSTOMER'),
        phoneNumber: z.string().regex(/^[0-9]{10,15}$/, 'Invalid phone number').optional(),
        address: z.string().optional(),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(1, 'Password is required'),
    }),
});

export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Token is required'),
        newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    }),
});

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(2).optional(),
        phoneNumber: z.string().regex(/^[0-9]{10,15}$/).optional(),
        address: z.string().optional(),
        profileImage: z.string().url().optional(),
    }),
});