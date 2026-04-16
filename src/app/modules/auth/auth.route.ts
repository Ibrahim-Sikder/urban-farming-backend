import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authLimiter } from '@/app/shared/middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);

export const authRoutes = router;