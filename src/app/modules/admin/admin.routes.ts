// modules/admin/admin.routes.ts
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

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Dashboard
router.get('/dashboard/stats', validate(dashboardFiltersSchema), AdminController.getDashboardStats);

// User Management
router.get('/users', AdminController.getAllUsers);
router.patch('/users/:id/status', validate(updateUserStatusSchema), AdminController.updateUserStatus);
router.delete('/users/:id', AdminController.deleteUser);

// Vendor Management
router.get('/vendors', AdminController.getAllVendors);
router.patch('/vendors/:id/verify', validate(verifyVendorSchema), AdminController.verifyVendor);

// Certification Management
router.get('/certifications', AdminController.getAllCertifications);
router.patch('/certifications/:id/verify', validate(verifyCertificationSchema), AdminController.verifyCertification);

// Rental Space Management (View Only - since no approval needed)
router.get('/rental-spaces', AdminController.getAllRentalSpaces);

// Order Management
router.get('/orders', AdminController.getAllOrders);

export const adminRoutes = router;