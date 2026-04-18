"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserStatusSchema = exports.refreshTokenSchema = exports.updateProfileSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.changePasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(100),
        email: zod_1.z.string().email('Invalid email format'),
        password: zod_1.z.string()
            .min(6, 'Password must be at least 6 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
        role: zod_1.z.enum(['ADMIN', 'VENDOR', 'CUSTOMER']).optional().default('CUSTOMER'),
        phoneNumber: zod_1.z.string().regex(/^[0-9]{10,15}$/, 'Invalid phone number').optional(),
        address: zod_1.z.string().optional(),
        farmName: zod_1.z.string().optional(),
        farmLocation: zod_1.z.string().optional(),
        documents: zod_1.z.array(zod_1.z.string()).optional(),
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
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email format'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, 'Current password is required'),
        newPassword: zod_1.z.string()
            .min(6, 'New password must be at least 6 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    }),
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string()
            .email('Please provide a valid email address')
            .min(1, 'Email is required'),
    }),
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Reset token is required'),
        newPassword: zod_1.z.string()
            .min(8, 'Password must be at least 8 characters long')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
        confirmPassword: zod_1.z.string().min(1, 'Please confirm your password'),
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }),
});
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Name must be at least 2 characters').optional(),
        phoneNumber: zod_1.z.string().regex(/^[0-9]{10,15}$/, 'Invalid phone number').optional(),
        address: zod_1.z.string().optional(),
        profileImage: zod_1.z.string().url('Invalid URL format').optional(),
    }),
});
exports.refreshTokenSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
    }),
});
exports.updateUserStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
            required_error: 'Status is required',
        }),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid user ID format'),
    }),
});
//# sourceMappingURL=auth.validation.js.map