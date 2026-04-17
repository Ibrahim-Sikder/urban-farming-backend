// modules/admin/admin.controller.ts
import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { ResponseHandler } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/middleware/auth';

export class AdminController {

    // ============ DASHBOARD ============
    static async getDashboardStats(req: Request, res: Response): Promise<void> {
        try {
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
            };
            const stats = await AdminService.getDashboardStats(filters);
            ResponseHandler.success(res, stats, 'Dashboard stats fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // ============ USER MANAGEMENT ============
    static async getAllUsers(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const role = req.query.role as string;
            const status = req.query.status as string;
            const result = await AdminService.getAllUsers(page, limit, role, status);
            ResponseHandler.success(res, result, 'Users fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async updateUserStatus(req: Request, res: Response): Promise<void> {
        try {
            const userId = parseInt(req.params.id);
            const result = await AdminService.updateUserStatus(userId, req.body.status);
            ResponseHandler.success(res, result, 'User status updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async deleteUser(req: Request, res: Response): Promise<void> {
        try {
            const userId = parseInt(req.params.id);
            const result = await AdminService.deleteUser(userId);
            ResponseHandler.success(res, result, 'User deleted successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // ============ VENDOR MANAGEMENT ============
    static async getAllVendors(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const status = req.query.status as string;
            const result = await AdminService.getAllVendors(page, limit, status);
            ResponseHandler.success(res, result, 'Vendors fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async verifyVendor(req: Request, res: Response): Promise<void> {
        try {
            const vendorId = parseInt(req.params.id);
            const result = await AdminService.verifyVendor(vendorId, req.body.status, req.body.rejectionReason);
            ResponseHandler.success(res, result, 'Vendor verified successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // ============ CERTIFICATION MANAGEMENT ============
    static async getAllCertifications(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const status = req.query.status as string;
            const result = await AdminService.getAllCertifications(page, limit, status);
            ResponseHandler.success(res, result, 'Certifications fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async verifyCertification(req: Request, res: Response): Promise<void> {
        try {
            const certId = parseInt(req.params.id);
            const result = await AdminService.verifyCertification(certId, req.body.status, req.body.verificationNotes);
            ResponseHandler.success(res, result, 'Certification verified successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // ============ RENTAL SPACE MANAGEMENT ============
    static async getAllRentalSpaces(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const result = await AdminService.getAllRentalSpaces(page, limit);
            ResponseHandler.success(res, result, 'Rental spaces fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // ============ ORDER MANAGEMENT ============
    static async getAllOrders(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const status = req.query.status as string;
            const result = await AdminService.getAllOrders(page, limit, status);
            ResponseHandler.success(res, result, 'Orders fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}