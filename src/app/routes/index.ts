import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.route';

const router = Router();

const moduleRoutes = [
    { path: '/auth', route: authRoutes },
];

moduleRoutes.forEach((route) => {
    router.use(route.path, route.route);
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

export default router;