import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validation.middleware';
import { userOrderQuerySchema, userPlantQuerySchema, userRentalQuerySchema } from './user.validation';

const router = Router();

router.use(authenticate);
router.get('/dashboard/stats', UserController.getDashboardStats);
router.get('/orders', validate(userOrderQuerySchema), UserController.getOrders);
router.get('/orders/:id', UserController.getOrderById);

router.get('/rentals', validate(userRentalQuerySchema), UserController.getRentals);
router.get('/rentals/:id', UserController.getRentalById);

router.get('/plants', validate(userPlantQuerySchema), UserController.getPlants);
router.get('/plants/:id', UserController.getPlantById);

export const userRoutes = router;
