
import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(100),
        email: z.string().email('Invalid email format'),
        password: z.string()
            .min(6, 'Password must be at least 6 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
        role: z.enum(['ADMIN', 'VENDOR', 'CUSTOMER']).optional().default('CUSTOMER'),
        phoneNumber: z.string().regex(/^[0-9]{10,15}$/, 'Invalid phone number').optional(),
        address: z.string().optional(),
        farmName: z.string().optional(),
        farmLocation: z.string().optional(),
        documents: z.array(z.string()).optional(),
    }).refine(data => {
        if (data.role === 'VENDOR') {
            return data.farmName && data.farmLocation;
        }
        return true;
    }, {
        message: 'Farm name and location are required for vendors',
        path: ['farmName'],
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
        newPassword: z.string()
            .min(6, 'New password must be at least 6 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string()
            .email('Please provide a valid email address')
            .min(1, 'Email is required'),
    }),
});


export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Reset token is required'),
        newPassword: z.string()
            .min(8, 'Password must be at least 8 characters long')
            .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            ),
        confirmPassword: z.string().min(1, 'Please confirm your password'),
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }),
});

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').optional(),
        phoneNumber: z.string().regex(/^[0-9]{10,15}$/, 'Invalid phone number').optional(),
        address: z.string().optional(),
        profileImage: z.string().url('Invalid URL format').optional(),
    }),
});

export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
});

export const updateUserStatusSchema = z.object({
    body: z.object({
        status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
            required_error: 'Status is required',
        }),
    }),
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid user ID format'),
    }),
});