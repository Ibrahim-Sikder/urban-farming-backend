import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '@/app/shared/middleware/auth';


const router = Router();

router.use(authenticate);

router.get('/dashboard/stats', UserController.getDashboardStats);
router.get('/orders', UserController.getOrders);
router.get('/rentals', UserController.getRentals);
router.get('/plants', UserController.getPlants);

export default router;