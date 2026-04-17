import { Router } from 'express';
import { PlantController } from './plant.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import {
    createPlantSchema,
    updatePlantSchema,
    updateHealthStatusSchema,
    plantQuerySchema,
} from './plant.validation';
import { authenticate, authorize } from '../../shared/middleware/auth';

const router = Router();

// All plant routes require authentication
router.use(authenticate);

// Customer routes
router.post('/', authorize('CUSTOMER'), validate(createPlantSchema), PlantController.createPlant);
router.get('/', authorize('CUSTOMER'), validate(plantQuerySchema), PlantController.getUserPlants);
router.get('/stats', authorize('CUSTOMER'), PlantController.getPlantStats);
router.get('/:id', authorize('CUSTOMER'), PlantController.getPlantById);
router.put('/:id', authorize('CUSTOMER'), validate(updatePlantSchema), PlantController.updatePlant);
router.patch('/:id/health', authorize('CUSTOMER'), validate(updateHealthStatusSchema), PlantController.updateHealthStatus);
router.post('/:id/harvest', authorize('CUSTOMER'), PlantController.markAsHarvested);
router.delete('/:id', authorize('CUSTOMER'), PlantController.deletePlant);

// Admin routes
router.get('/admin/all', authorize('ADMIN'), validate(plantQuerySchema), PlantController.getAllPlants);

export const plantRoutes = router;