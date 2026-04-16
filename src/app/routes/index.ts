import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.route';
import { userRoutes } from '../modules/user/user.route';


const router = Router();

const moduleRoutes = [
    { path: '/auth', route: authRoutes },
    { path: '/user', route: userRoutes }
];

moduleRoutes.forEach((route) => {
    router.use(route.path, route.route);
});

router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

export default router;