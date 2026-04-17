"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RentalController = void 0;
const rental_service_1 = require("./rental.service");
const response_1 = require("../../shared/utils/response");
class RentalController {
    static async searchRentalSpaces(req, res) {
        try {
            const filters = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                location: req.query.location,
                minSize: req.query.minSize ? parseFloat(req.query.minSize) : undefined,
                maxSize: req.query.maxSize ? parseFloat(req.query.maxSize) : undefined,
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
                availability: req.query.availability === 'true',
            };
            const result = await rental_service_1.RentalService.searchRentalSpaces(filters);
            response_1.ResponseHandler.success(res, result, 'Rental spaces fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getRentalSpaceById(req, res) {
        try {
            const spaceId = parseInt(req.params.id);
            const space = await rental_service_1.RentalService.getRentalSpaceById(spaceId);
            response_1.ResponseHandler.success(res, space, 'Rental space fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 404);
        }
    }
    static async createBooking(req, res) {
        try {
            const booking = await rental_service_1.RentalService.createBooking(req.user.id, req.body);
            response_1.ResponseHandler.success(res, booking, 'Booking created successfully', 201);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getUserBookings(req, res) {
        try {
            const bookings = await rental_service_1.RentalService.getUserBookings(req.user.id);
            response_1.ResponseHandler.success(res, bookings, 'Bookings fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getBookingById(req, res) {
        try {
            const bookingId = parseInt(req.params.id);
            const booking = await rental_service_1.RentalService.getBookingById(req.user.id, bookingId);
            response_1.ResponseHandler.success(res, booking, 'Booking fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 404);
        }
    }
    static async cancelBooking(req, res) {
        try {
            const bookingId = parseInt(req.params.id);
            const result = await rental_service_1.RentalService.cancelBooking(req.user.id, bookingId, req.body.reason);
            response_1.ResponseHandler.success(res, result, 'Booking cancelled successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
}
exports.RentalController = RentalController;
//# sourceMappingURL=rental.controller.js.map