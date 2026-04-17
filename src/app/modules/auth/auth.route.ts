
import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/auth';
import { authLimiter, strictLimiter } from '../../shared/middleware/rateLimiter';
import { validate } from '../../shared/middleware/validation.middleware';
import { AuthController } from './auth.controller';
import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    refreshTokenSchema,
    registerSchema,
    updateProfileSchema,
    updateUserStatusSchema
} from './auth.validation';

const router = Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/refresh-token', validate(refreshTokenSchema), AuthController.refreshToken);
router.post('/forgot-password', strictLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', strictLimiter, AuthController.resetPassword);
router.use(authenticate);
router.get('/profile', AuthController.getProfile);
router.put('/profile', validate(updateProfileSchema), AuthController.updateProfile);
router.post('/change-password', validate(changePasswordSchema), AuthController.changePassword);
router.post('/logout', AuthController.logout);
router.post('/logout-all', AuthController.logoutAll);
router.get('/users', authorize('ADMIN'), AuthController.getAllUsers);
router.patch('/users/:id/status', authorize('ADMIN'), validate(updateUserStatusSchema), AuthController.updateUserStatus);
router.delete('/users/:id', authorize('ADMIN'), AuthController.deleteUser);

export const authRoutes = router;