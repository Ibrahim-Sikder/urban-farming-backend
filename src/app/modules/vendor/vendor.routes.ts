import { Router } from 'express';

import { authenticate, authorize } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validation.middleware';
import {
    updateVendorProfileSchema,
    createProduceSchema,
    updateProduceSchema,
    createRentalSpaceSchema,
    updateRentalSpaceSchema,
    submitCertificationSchema,
    updateOrderStatusSchema,
    getVendorOrdersSchema,
} from './vendor.validation';
import { VendorController } from './vendor.controller';

const router = Router();

// All vendor routes require authentication and VENDOR role
router.use(authenticate);
router.use(authorize('VENDOR'));

// ============ PROFILE ROUTES ============
router.get('/profile', VendorController.getProfile);
router.put('/profile', validate(updateVendorProfileSchema), VendorController.updateProfile);

// ============ CERTIFICATION ROUTES ============
router.get('/certification/status', VendorController.getCertificationStatus);
router.post('/certification/submit', validate(submitCertificationSchema), VendorController.submitCertification);

// ============ PRODUCE ROUTES ============
router.post('/produce', validate(createProduceSchema), VendorController.createProduce);
router.get('/produce', VendorController.getProduce);
router.put('/produce/:id', validate(updateProduceSchema), VendorController.updateProduce);
router.delete('/produce/:id', VendorController.deleteProduce);

// ============ RENTAL SPACE ROUTES ============
router.post('/rental-spaces', validate(createRentalSpaceSchema), VendorController.createRentalSpace);
router.get('/rental-spaces', VendorController.getRentalSpaces);
router.put('/rental-spaces/:id', validate(updateRentalSpaceSchema), VendorController.updateRentalSpace);
router.delete('/rental-spaces/:id', VendorController.deleteRentalSpace);

// ============ ORDER MANAGEMENT ROUTES ============
router.get('/orders', validate(getVendorOrdersSchema), VendorController.getOrders);
router.patch('/orders/:id/status', validate(updateOrderStatusSchema), VendorController.updateOrderStatus);

// ============ BOOKINGS ROUTES ============
router.get('/bookings', VendorController.getBookings);

// ============ REPORTING ROUTES ============
router.get('/reports/revenue', VendorController.getRevenueReport);

export const vendorRoutes = router;