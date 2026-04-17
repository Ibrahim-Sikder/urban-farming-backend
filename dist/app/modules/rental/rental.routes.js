"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rentalRoutes = void 0;
const express_1 = require("express");
const rental_controller_1 = require("./rental.controller");
const validation_middleware_1 = require("../../shared/middleware/validation.middleware");
const rental_validation_1 = require("./rental.validation");
const auth_1 = require("../../shared/middleware/auth");
const router = (0, express_1.Router)();
router.get('/spaces', (0, validation_middleware_1.validate)(rental_validation_1.searchRentalSpaceSchema), rental_controller_1.RentalController.searchRentalSpaces);
router.get('/spaces/:id', rental_controller_1.RentalController.getRentalSpaceById);
router.use(auth_1.authenticate);
router.post('/bookings', (0, auth_1.authorize)('CUSTOMER'), (0, validation_middleware_1.validate)(rental_validation_1.createRentalBookingSchema), rental_controller_1.RentalController.createBooking);
router.get('/bookings', (0, auth_1.authorize)('CUSTOMER'), rental_controller_1.RentalController.getUserBookings);
router.get('/bookings/:id', (0, auth_1.authorize)('CUSTOMER'), rental_controller_1.RentalController.getBookingById);
router.patch('/bookings/:id/cancel', (0, auth_1.authorize)('CUSTOMER'), rental_controller_1.RentalController.cancelBooking);
exports.rentalRoutes = router;
//# sourceMappingURL=rental.routes.js.map