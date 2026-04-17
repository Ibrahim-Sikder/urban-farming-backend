// modules/plant/plant.routes.ts
import { Router } from 'express';
import { PlantController } from './plant.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import {
    createPlantSchema,
    updatePlantSchema,
    updateHealthStatusSchema,
} from './plant.validation';
import { authenticate, authorize } from '../../shared/middleware/auth';

const router = Router();

// All plant routes require authentication
router.use(authenticate);
router.use(authorize('CUSTOMER'));

router.post('/', validate(createPlantSchema), PlantController.createPlant);
router.get('/', PlantController.getUserPlants);
router.get('/stats', PlantController.getPlantStats);
router.get('/:id', PlantController.getPlantById);
router.put('/:id', validate(updatePlantSchema), PlantController.updatePlant);
router.patch('/:id/health', validate(updateHealthStatusSchema), PlantController.updateHealthStatus);
router.post('/:id/harvest', PlantController.markAsHarvested);
router.delete('/:id', PlantController.deletePlant);

export const plantRoutes = router;