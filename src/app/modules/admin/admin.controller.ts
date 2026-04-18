import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { ResponseHandler } from '../../shared/utils/response';
export class AdminController {

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


    static async getAllUsers(req: Request, res: Response): Promise<void> {
        try {
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                searchTerm: req.query.searchTerm as string,
                role: req.query.role as any,
                status: req.query.status as any,
            };
            const result = await AdminService.getAllUsers(queryParams);
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

    static async getAllVendors(req: Request, res: Response): Promise<void> {
        try {
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                searchTerm: req.query.searchTerm as string,
                certificationStatus: req.query.certificationStatus as any,
            };
            const result = await AdminService.getAllVendors(queryParams);
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

    static async getAllCertifications(req: Request, res: Response): Promise<void> {
        try {
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                verificationStatus: req.query.verificationStatus as any,
                vendorId: req.query.vendorId ? parseInt(req.query.vendorId as string) : undefined,
            };
            const result = await AdminService.getAllCertifications(queryParams);
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

    static async getAllRentalSpaces(req: Request, res: Response): Promise<void> {
        try {
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                searchTerm: req.query.searchTerm as string,
            };
            const result = await AdminService.getAllRentalSpaces(queryParams);
            ResponseHandler.success(res, result, 'Rental spaces fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getAllOrders(req: Request, res: Response): Promise<void> {
        try {
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                status: req.query.status as any,
                minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
                maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
            };
            const result = await AdminService.getAllOrders(queryParams);
            ResponseHandler.success(res, result, 'Orders fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}