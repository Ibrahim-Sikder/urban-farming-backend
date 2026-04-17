import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.route';
import { userRoutes } from '../modules/user/user.route';
import { communityRoutes } from '../modules/community/community.routes';
import { vendorRoutes } from '../modules/vendor/vendor.routes';
import { plantRoutes } from '../modules/plant/plant.routes';
import { rentalRoutes } from '../modules/rental/rental.routes';
import { marketplaceRoutes } from '../modules/marketplace/marketplace.routes';
import { benchmarkRoutes } from '../modules/benchmark/benchmark.routes';


const router = Router();

const moduleRoutes = [
    { path: '/auth', route: authRoutes },
    { path: '/users', route: userRoutes },
    { path: '/community', route: communityRoutes },
    { path: '/vendors', route: vendorRoutes },
    { path: '/rental', route: rentalRoutes },
    { path: '/plants', route: plantRoutes },
    { path: '/marketplace', route: marketplaceRoutes },
    { path: '/benchmark', route: benchmarkRoutes }

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