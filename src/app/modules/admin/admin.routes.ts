
import { Router } from 'express';
import { AdminController } from './admin.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import {
    updateUserStatusSchema,
    verifyVendorSchema,
    verifyCertificationSchema,
    dashboardFiltersSchema
} from './admin.validation';
import { authenticate, authorize } from '../../shared/middleware/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/dashboard/stats', validate(dashboardFiltersSchema), AdminController.getDashboardStats);


router.get('/users', AdminController.getAllUsers);
router.patch('/users/:id/status', validate(updateUserStatusSchema), AdminController.updateUserStatus);
router.delete('/users/:id', AdminController.deleteUser);


router.get('/vendors', AdminController.getAllVendors);
router.patch('/vendors/:id/verify', validate(verifyVendorSchema), AdminController.verifyVendor);


router.get('/certifications', AdminController.getAllCertifications);
router.patch('/certifications/:id/verify', validate(verifyCertificationSchema), AdminController.verifyCertification);

router.get('/rental-spaces', AdminController.getAllRentalSpaces);
router.get('/orders', AdminController.getAllOrders);

export const adminRoutes = router;