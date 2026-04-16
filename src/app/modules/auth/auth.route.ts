import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { validate } from '../../middlewares/validation.middleware';
import { authLimiter } from '../../middlewares/rateLimiter';
import {
    registerSchema,
    loginSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema,
} from './auth.validation';

const router = Router();

// Public routes
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

// Protected routes (authenticated users)
router.use(authenticate);
router.get('/profile', AuthController.getProfile);
router.put('/profile', validate(updateProfileSchema), AuthController.updateProfile);
router.post('/change-password', validate(changePasswordSchema), AuthController.changePassword);

// Admin only routes
router.get('/users', authorize('ADMIN'), AuthController.getAllUsers);
router.patch('/users/:id/status', authorize('ADMIN'), AuthController.updateUserStatus);
router.delete('/users/:id', authorize('ADMIN'), AuthController.deleteUser);

export default router;