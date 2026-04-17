
import { Router } from 'express';
import { RentalController } from './rental.controller';
import { authenticate, authorize } from '../../shared/middleware/auth';
import { validate } from '../../shared/middleware/validation.middleware';
import {
    createRentalBookingSchema,
    updateRentalBookingSchema,
    searchRentalSpaceSchema,
} from './rental.validation';

const router = Router();

router.get('/spaces', validate(searchRentalSpaceSchema), RentalController.searchRentalSpaces);
router.get('/spaces/:id', RentalController.getRentalSpaceById);

router.use(authenticate);


router.post('/bookings', validate(createRentalBookingSchema), RentalController.createBooking);
router.get('/bookings', RentalController.getUserBookings);
router.get('/bookings/:id', RentalController.getBookingById);
router.post('/bookings/:id/cancel', RentalController.cancelBooking);

router.get('/vendor/bookings', authorize('VENDOR', 'ADMIN'), RentalController.getVendorBookings);
router.patch('/vendor/bookings/:id/status', authorize('VENDOR', 'ADMIN'), validate(updateRentalBookingSchema), RentalController.updateBookingStatus);

export const rentalRoutes = router;