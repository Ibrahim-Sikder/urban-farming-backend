// modules/vendor/vendor.controller.ts
import { Response } from 'express';
import { VendorService } from './vendor.service';
import { AuthRequest } from '../../shared/middleware/auth';
import { ResponseHandler } from '../../shared/utils/response';

export class VendorController {

    // ============ PROFILE MANAGEMENT ============

    static async getProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const profile = await VendorService.getVendorProfile(req.user!.id);
            ResponseHandler.success(res, profile, 'Vendor profile fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const result = await VendorService.updateVendorProfile(req.user!.id, req.body);
            ResponseHandler.success(res, result, 'Profile updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // ============ PRODUCE MANAGEMENT ============

    static async createProduce(req: AuthRequest, res: Response): Promise<void> {
        try {
            const produce = await VendorService.createProduce(req.user!.id, req.body);
            ResponseHandler.success(res, produce, 'Product created successfully', 201);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getProduce(req: AuthRequest, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const result = await VendorService.getVendorProduce(req.user!.id, page, limit);
            ResponseHandler.success(res, result, 'Products fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async updateProduce(req: AuthRequest, res: Response): Promise<void> {
        try {
            const produceId = parseInt(req.params.id);
            const result = await VendorService.updateProduce(req.user!.id, produceId, req.body);
            ResponseHandler.success(res, result, 'Product updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async deleteProduce(req: AuthRequest, res: Response): Promise<void> {
        try {
            const produceId = parseInt(req.params.id);
            const result = await VendorService.deleteProduce(req.user!.id, produceId);
            ResponseHandler.success(res, result, 'Product deleted successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // ============ RENTAL SPACE MANAGEMENT ============

    static async createRentalSpace(req: AuthRequest, res: Response): Promise<void> {
        try {
            const space = await VendorService.createRentalSpace(req.user!.id, req.body);
            ResponseHandler.success(res, space, 'Rental space created successfully', 201);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getRentalSpaces(req: AuthRequest, res: Response): Promise<void> {
        try {
            const spaces = await VendorService.getVendorRentalSpaces(req.user!.id);
            ResponseHandler.success(res, spaces, 'Rental spaces fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async updateRentalSpace(req: AuthRequest, res: Response): Promise<void> {
        try {
            const spaceId = parseInt(req.params.id);
            const result = await VendorService.updateRentalSpace(req.user!.id, spaceId, req.body);
            ResponseHandler.success(res, result, 'Rental space updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async deleteRentalSpace(req: AuthRequest, res: Response): Promise<void> {
        try {
            const spaceId = parseInt(req.params.id);
            const result = await VendorService.deleteRentalSpace(req.user!.id, spaceId);
            ResponseHandler.success(res, result, 'Rental space deleted successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // ============ CERTIFICATION MANAGEMENT ============

    static async submitCertification(req: AuthRequest, res: Response): Promise<void> {
        try {
            const result = await VendorService.submitCertification(req.user!.id, req.body);
            ResponseHandler.success(res, result, 'Certification submitted successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getCertificationStatus(req: AuthRequest, res: Response): Promise<void> {
        try {
            const status = await VendorService.getCertificationStatus(req.user!.id);
            ResponseHandler.success(res, status, 'Certification status fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // ============ ORDER MANAGEMENT ============

    static async getOrders(req: AuthRequest, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const status = req.query.status as string;

            const result = await VendorService.getVendorOrders(req.user!.id, page, limit, status);
            ResponseHandler.success(res, result, 'Orders fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orderId = parseInt(req.params.id);
            const result = await VendorService.updateOrderStatus(req.user!.id, orderId, req.body);
            ResponseHandler.success(res, result, 'Order status updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // ============ BOOKINGS MANAGEMENT ============

    static async getBookings(req: AuthRequest, res: Response): Promise<void> {
        try {
            const bookings = await VendorService.getVendorBookings(req.user!.id);
            ResponseHandler.success(res, bookings, 'Bookings fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // ============ REVENUE REPORT ============

    static async getRevenueReport(req: AuthRequest, res: Response): Promise<void> {
        try {
            const report = await VendorService.getRevenueReport(req.user!.id);
            ResponseHandler.success(res, report, 'Revenue report generated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}