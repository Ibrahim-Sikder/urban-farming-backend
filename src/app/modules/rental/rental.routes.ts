// modules/rental/rental.routes.ts
import { Router } from 'express';
import { RentalController } from './rental.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import {
    createRentalBookingSchema,
    updateRentalBookingSchema,
    searchRentalSpaceSchema,
} from './rental.validation';
import { authenticate, authorize } from '../../shared/middleware/auth';

const router = Router();

// ============ PUBLIC ROUTES (Search Spaces) ============
router.get('/spaces', validate(searchRentalSpaceSchema), RentalController.searchRentalSpaces);
router.get('/spaces/:id', RentalController.getRentalSpaceById);

// ============ PROTECTED ROUTES ============
router.use(authenticate);

// Booking Routes (Customer only)
router.post('/bookings', authorize('CUSTOMER'), validate(createRentalBookingSchema), RentalController.createBooking);
router.get('/bookings', authorize('CUSTOMER'), RentalController.getUserBookings);
router.get('/bookings/:id', authorize('CUSTOMER'), RentalController.getBookingById);
router.patch('/bookings/:id/cancel', authorize('CUSTOMER'), RentalController.cancelBooking);

export const rentalRoutes = router;