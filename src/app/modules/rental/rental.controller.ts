import { Request, Response } from 'express';
import { RentalService } from './rental.service';
import { ResponseHandler } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/middleware/auth';

export class RentalController {

    // ============ SEARCH RENTAL SPACES ============
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
                availability: req.query.availability === 'true',
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                searchTerm: req.query.searchTerm as string,
            };
            const result = await RentalService.searchRentalSpaces(filters);
            ResponseHandler.success(res, result, 'Rental spaces fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getRentalSpaceById(req: Request, res: Response): Promise<void> {
        try {
            const spaceId = parseInt(req.params.id);
            const space = await RentalService.getRentalSpaceById(spaceId);
            ResponseHandler.success(res, space, 'Rental space fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 404);
        }
    }

    // ============ RENTAL BOOKINGS ============
    static async createBooking(req: AuthRequest, res: Response): Promise<void> {
        try {
            const booking = await RentalService.createBooking(req.user!.id, req.body);
            ResponseHandler.success(res, booking, 'Booking created successfully', 201);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getUserBookings(req: AuthRequest, res: Response): Promise<void> {
        try {
            const filters = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                status: req.query.status as any,
            };
            const bookings = await RentalService.getUserBookings(req.user!.id, filters);
            ResponseHandler.success(res, bookings, 'Bookings fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getBookingById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const bookingId = parseInt(req.params.id);
            const booking = await RentalService.getBookingById(req.user!.id, bookingId);
            ResponseHandler.success(res, booking, 'Booking fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 404);
        }
    }

    static async cancelBooking(req: AuthRequest, res: Response): Promise<void> {
        try {
            const bookingId = parseInt(req.params.id);
            const result = await RentalService.cancelBooking(req.user!.id, bookingId, req.body.reason);
            ResponseHandler.success(res, result, 'Booking cancelled successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}