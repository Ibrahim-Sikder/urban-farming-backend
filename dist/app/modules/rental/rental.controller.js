"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RentalController = void 0;
const rental_service_1 = require("./rental.service");
const response_1 = require("../../shared/utils/response");
const client_1 = require("@prisma/client");
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
                availability: req.query.availability === 'true' ? true : req.query.availability === 'false' ? false : undefined,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                searchTerm: req.query.searchTerm,
            };
            const result = await rental_service_1.RentalService.searchRentalSpaces(filters);
            response_1.ResponseHandler.success(res, result, 'Rental spaces fetched successfully');
        }
        catch (error) {
            console.error('Search rental spaces error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to search rental spaces', 400);
        }
    }
    static async getRentalSpaceById(req, res) {
        try {
            const spaceId = parseInt(req.params.id);
            if (isNaN(spaceId)) {
                response_1.ResponseHandler.error(res, 'Invalid space ID', 400);
                return;
            }
            const space = await rental_service_1.RentalService.getRentalSpaceById(spaceId);
            response_1.ResponseHandler.success(res, space, 'Rental space fetched successfully');
        }
        catch (error) {
            console.error('Get rental space error:', error);
            if (error.message === 'Rental space not found') {
                response_1.ResponseHandler.error(res, error.message, 404);
            }
            else {
                response_1.ResponseHandler.error(res, error.message || 'Failed to fetch rental space', 400);
            }
        }
    }
    static async createBooking(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const booking = await rental_service_1.RentalService.createBooking(req.user.id, req.body);
            response_1.ResponseHandler.success(res, booking, 'Booking created successfully', 201);
        }
        catch (error) {
            console.error('Create booking error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to create booking', 400);
        }
    }
    static async getUserBookings(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const filters = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                status: req.query.status,
            };
            const bookings = await rental_service_1.RentalService.getUserBookings(req.user.id, filters);
            response_1.ResponseHandler.success(res, bookings, 'Bookings fetched successfully');
        }
        catch (error) {
            console.error('Get user bookings error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to fetch bookings', 400);
        }
    }
    static async getBookingById(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const bookingId = parseInt(req.params.id);
            if (isNaN(bookingId)) {
                response_1.ResponseHandler.error(res, 'Invalid booking ID', 400);
                return;
            }
            const booking = await rental_service_1.RentalService.getBookingById(req.user.id, bookingId);
            response_1.ResponseHandler.success(res, booking, 'Booking fetched successfully');
        }
        catch (error) {
            console.error('Get booking by id error:', error);
            if (error.message === 'Booking not found') {
                response_1.ResponseHandler.error(res, error.message, 404);
            }
            else {
                response_1.ResponseHandler.error(res, error.message || 'Failed to fetch booking', 400);
            }
        }
    }
    static async cancelBooking(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const bookingId = parseInt(req.params.id);
            if (isNaN(bookingId)) {
                response_1.ResponseHandler.error(res, 'Invalid booking ID', 400);
                return;
            }
            const result = await rental_service_1.RentalService.cancelBooking(req.user.id, bookingId, req.body.reason);
            response_1.ResponseHandler.success(res, result, 'Booking cancelled successfully');
        }
        catch (error) {
            console.error('Cancel booking error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to cancel booking', 400);
        }
    }
    static async getVendorBookings(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const filters = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                status: req.query.status,
            };
            const bookings = await rental_service_1.RentalService.getVendorBookings(req.user.id, filters);
            response_1.ResponseHandler.success(res, bookings, 'Vendor bookings fetched successfully');
        }
        catch (error) {
            console.error('Get vendor bookings error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to fetch vendor bookings', 400);
        }
    }
    static async updateBookingStatus(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const bookingId = parseInt(req.params.id);
            if (isNaN(bookingId)) {
                response_1.ResponseHandler.error(res, 'Invalid booking ID', 400);
                return;
            }
            const { status } = req.body;
            if (!status || !Object.values(client_1.OrderStatus).includes(status)) {
                response_1.ResponseHandler.error(res, 'Invalid status', 400);
                return;
            }
            const result = await rental_service_1.RentalService.updateBookingStatus(req.user.id, bookingId, status);
            response_1.ResponseHandler.success(res, result, `Booking ${status.toLowerCase()} successfully`);
        }
        catch (error) {
            console.error('Update booking status error:', error);
            response_1.ResponseHandler.error(res, error.message || 'Failed to update booking status', 400);
        }
    }
}
exports.RentalController = RentalController;
//# sourceMappingURL=rental.controller.js.map