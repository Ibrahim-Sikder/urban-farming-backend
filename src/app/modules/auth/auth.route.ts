// modules/auth/auth.routes.ts
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import {
    registerSchema,
    loginSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema,
    refreshTokenSchema,
    updateUserStatusSchema,
} from './auth.validation';
import { authLimiter, strictLimiter } from '../../shared/middleware/rateLimiter';
import { authenticate, authorize } from '../../shared/middleware/auth';

const router = Router();

// ============ PUBLIC ROUTES ============
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/refresh-token', validate(refreshTokenSchema), AuthController.refreshToken);
router.post('/forgot-password', strictLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', strictLimiter, validate(resetPasswordSchema), AuthController.resetPassword);

// ============ PROTECTED ROUTES (AUTHENTICATED USERS) ============
router.use(authenticate);
router.get('/profile', AuthController.getProfile);
router.put('/profile', validate(updateProfileSchema), AuthController.updateProfile);
router.post('/change-password', validate(changePasswordSchema), AuthController.changePassword);
router.post('/logout', AuthController.logout);
router.post('/logout-all', AuthController.logoutAll);

// ============ ADMIN ONLY ROUTES ============
router.get('/users', authorize('ADMIN'), AuthController.getAllUsers);
router.patch('/users/:id/status', authorize('ADMIN'), validate(updateUserStatusSchema), AuthController.updateUserStatus);
router.delete('/users/:id', authorize('ADMIN'), AuthController.deleteUser);

export const authRoutes = router;