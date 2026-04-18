
import { Request, Response } from 'express';
import { RentalService } from './rental.service';
import { ResponseHandler } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/middleware/auth';
import { OrderStatus } from '@prisma/client';

export class RentalController {

    static async searchRentalSpaces(req: Request, res: Response): Promise<void> {
        try {
            const filters = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                location: req.query.location as string,
                minSize: req.query.minSize ? parseFloat(req.query.minSize as string) : undefined,
                maxSize: req.query.maxSize ? parseFloat(req.query.maxSize as string) : undefined,
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
                availability: req.query.availability === 'true' ? true : req.query.availability === 'false' ? false : undefined,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                searchTerm: req.query.searchTerm as string,
            };
            const result = await RentalService.searchRentalSpaces(filters);
            ResponseHandler.success(res, result, 'Rental spaces fetched successfully');
        } catch (error: any) {
            console.error('Search rental spaces error:', error);
            ResponseHandler.error(res, error.message || 'Failed to search rental spaces', 400);
        }
    }

    static async getRentalSpaceById(req: Request, res: Response): Promise<void> {
        try {
            const spaceId = parseInt(req.params.id);
            if (isNaN(spaceId)) {
                ResponseHandler.error(res, 'Invalid space ID', 400);
                return;
            }
            const space = await RentalService.getRentalSpaceById(spaceId);
            ResponseHandler.success(res, space, 'Rental space fetched successfully');
        } catch (error: any) {
            console.error('Get rental space error:', error);
            if (error.message === 'Rental space not found') {
                ResponseHandler.error(res, error.message, 404);
            } else {
                ResponseHandler.error(res, error.message || 'Failed to fetch rental space', 400);
            }
        }
    }

    static async createBooking(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const booking = await RentalService.createBooking(req.user.id, req.body);
            ResponseHandler.success(res, booking, 'Booking created successfully', 201);
        } catch (error: any) {
            console.error('Create booking error:', error);
            ResponseHandler.error(res, error.message || 'Failed to create booking', 400);
        }
    }

    static async getUserBookings(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const filters = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                status: req.query.status as OrderStatus,
            };
            const bookings = await RentalService.getUserBookings(req.user.id, filters);
            ResponseHandler.success(res, bookings, 'Bookings fetched successfully');
        } catch (error: any) {
            console.error('Get user bookings error:', error);
            ResponseHandler.error(res, error.message || 'Failed to fetch bookings', 400);
        }
    }

    static async getBookingById(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const bookingId = parseInt(req.params.id);
            if (isNaN(bookingId)) {
                ResponseHandler.error(res, 'Invalid booking ID', 400);
                return;
            }
            const booking = await RentalService.getBookingById(req.user.id, bookingId);
            ResponseHandler.success(res, booking, 'Booking fetched successfully');
        } catch (error: any) {
            console.error('Get booking by id error:', error);
            if (error.message === 'Booking not found') {
                ResponseHandler.error(res, error.message, 404);
            } else {
                ResponseHandler.error(res, error.message || 'Failed to fetch booking', 400);
            }
        }
    }

    static async cancelBooking(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const bookingId = parseInt(req.params.id);
            if (isNaN(bookingId)) {
                ResponseHandler.error(res, 'Invalid booking ID', 400);
                return;
            }
            const result = await RentalService.cancelBooking(req.user.id, bookingId, req.body.reason);
            ResponseHandler.success(res, result, 'Booking cancelled successfully');
        } catch (error: any) {
            console.error('Cancel booking error:', error);
            ResponseHandler.error(res, error.message || 'Failed to cancel booking', 400);
        }
    }
    static async getVendorBookings(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const filters = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                status: req.query.status as OrderStatus,
            };
            const bookings = await RentalService.getVendorBookings(req.user.id, filters);
            ResponseHandler.success(res, bookings, 'Vendor bookings fetched successfully');
        } catch (error: any) {
            console.error('Get vendor bookings error:', error);
            ResponseHandler.error(res, error.message || 'Failed to fetch vendor bookings', 400);
        }
    }

    static async updateBookingStatus(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const bookingId = parseInt(req.params.id);
            if (isNaN(bookingId)) {
                ResponseHandler.error(res, 'Invalid booking ID', 400);
                return;
            }
            const { status } = req.body;
            if (!status || !Object.values(OrderStatus).includes(status)) {
                ResponseHandler.error(res, 'Invalid status', 400);
                return;
            }
            const result = await RentalService.updateBookingStatus(req.user.id, bookingId, status);
            ResponseHandler.success(res, result, `Booking ${status.toLowerCase()} successfully`);
        } catch (error: any) {
            console.error('Update booking status error:', error);
            ResponseHandler.error(res, error.message || 'Failed to update booking status', 400);
        }
    }
}