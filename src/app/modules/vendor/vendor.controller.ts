import { Response } from 'express';
import { VendorService } from './vendor.service';
import { AuthRequest } from '../../shared/middleware/auth';
import { ResponseHandler } from '../../shared/utils/response';

export class VendorController {


    static async getProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const profile = await VendorService.getVendorProfile(req.user.id);
            ResponseHandler.success(res, profile, 'Vendor profile fetched successfully');
        } catch (error: any) {
            console.error('Get profile error:', error);
            if (error.message === 'Vendor profile not found') {
                ResponseHandler.error(res, 'Vendor profile not found', 404);
            } else {
                ResponseHandler.error(res, error.message || 'Failed to fetch vendor profile', 400);
            }
        }
    }

    static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const updatedProfile = await VendorService.updateVendorProfile(req.user.id, req.body);
            ResponseHandler.success(res, updatedProfile, 'Profile updated successfully');
        } catch (error: any) {
            console.error('Update profile error:', error);
            if (error.message === 'Vendor profile not found') {
                ResponseHandler.error(res, 'Vendor profile not found', 404);
            } else {
                ResponseHandler.error(res, error.message || 'Failed to update vendor profile', 400);
            }
        }
    }


    static async createProduce(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const produce = await VendorService.createProduce(req.user.id, req.body);
            ResponseHandler.success(res, produce, 'Product created successfully', 201);
        } catch (error: any) {
            console.error('Create produce error:', error);
            ResponseHandler.error(res, error.message || 'Failed to create product', 400);
        }
    }

    static async getProduce(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                searchTerm: req.query.searchTerm as string,
                category: req.query.category as string,
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
                certificationStatus: req.query.certificationStatus as any,
            };
            const result = await VendorService.getVendorProduce(req.user.id, queryParams);
            ResponseHandler.success(res, result, 'Products fetched successfully');
        } catch (error: any) {
            console.error('Get produce error:', error);
            ResponseHandler.error(res, error.message || 'Failed to fetch products', 400);
        }
    }

    static async updateProduce(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const produceId = parseInt(req.params.id);
            if (isNaN(produceId)) {
                ResponseHandler.error(res, 'Invalid product ID', 400);
                return;
            }
            const result = await VendorService.updateProduce(req.user.id, produceId, req.body);
            ResponseHandler.success(res, result, 'Product updated successfully');
        } catch (error: any) {
            console.error('Update produce error:', error);
            if (error.message === 'Produce not found or unauthorized') {
                ResponseHandler.error(res, 'Product not found', 404);
            } else {
                ResponseHandler.error(res, error.message || 'Failed to update product', 400);
            }
        }
    }

    static async deleteProduce(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const produceId = parseInt(req.params.id);
            if (isNaN(produceId)) {
                ResponseHandler.error(res, 'Invalid product ID', 400);
                return;
            }
            const result = await VendorService.deleteProduce(req.user.id, produceId);
            ResponseHandler.success(res, result, 'Product deleted successfully');
        } catch (error: any) {
            console.error('Delete produce error:', error);
            ResponseHandler.error(res, error.message || 'Failed to delete product', 400);
        }
    }


    static async createRentalSpace(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const space = await VendorService.createRentalSpace(req.user.id, req.body);
            ResponseHandler.success(res, space, 'Rental space created successfully', 201);
        } catch (error: any) {
            console.error('Create rental space error:', error);
            ResponseHandler.error(res, error.message || 'Failed to create rental space', 400);
        }
    }

    static async getRentalSpaces(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const spaces = await VendorService.getVendorRentalSpaces(req.user.id);
            ResponseHandler.success(res, spaces, 'Rental spaces fetched successfully');
        } catch (error: any) {
            console.error('Get rental spaces error:', error);
            ResponseHandler.error(res, error.message || 'Failed to fetch rental spaces', 400);
        }
    }

    static async updateRentalSpace(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const spaceId = parseInt(req.params.id);
            if (isNaN(spaceId)) {
                ResponseHandler.error(res, 'Invalid space ID', 400);
                return;
            }
            const result = await VendorService.updateRentalSpace(req.user.id, spaceId, req.body);
            ResponseHandler.success(res, result, 'Rental space updated successfully');
        } catch (error: any) {
            console.error('Update rental space error:', error);
            if (error.message === 'Rental space not found or unauthorized') {
                ResponseHandler.error(res, 'Rental space not found', 404);
            } else {
                ResponseHandler.error(res, error.message || 'Failed to update rental space', 400);
            }
        }
    }

    static async deleteRentalSpace(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const spaceId = parseInt(req.params.id);
            if (isNaN(spaceId)) {
                ResponseHandler.error(res, 'Invalid space ID', 400);
                return;
            }
            const result = await VendorService.deleteRentalSpace(req.user.id, spaceId);
            ResponseHandler.success(res, result, 'Rental space deleted successfully');
        } catch (error: any) {
            console.error('Delete rental space error:', error);
            ResponseHandler.error(res, error.message || 'Failed to delete rental space', 400);
        }
    }


    static async submitCertification(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const result = await VendorService.submitCertification(req.user.id, req.body);
            ResponseHandler.success(res, result, 'Certification submitted successfully');
        } catch (error: any) {
            console.error('Submit certification error:', error);
            ResponseHandler.error(res, error.message || 'Failed to submit certification', 400);
        }
    }

    static async getCertificationStatus(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const status = await VendorService.getCertificationStatus(req.user.id);
            ResponseHandler.success(res, status, 'Certification status fetched successfully');
        } catch (error: any) {
            console.error('Get certification error:', error);
            ResponseHandler.error(res, error.message || 'Failed to fetch certification status', 400);
        }
    }

    static async getOrders(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                status: req.query.status as any,
            };
            const result = await VendorService.getVendorOrders(req.user.id, queryParams);
            ResponseHandler.success(res, result, 'Orders fetched successfully');
        } catch (error: any) {
            console.error('Get orders error:', error);
            ResponseHandler.error(res, error.message || 'Failed to fetch orders', 400);
        }
    }

    static async updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const orderId = parseInt(req.params.id);
            if (isNaN(orderId)) {
                ResponseHandler.error(res, 'Invalid order ID', 400);
                return;
            }
            const result = await VendorService.updateOrderStatus(req.user.id, orderId, req.body);
            ResponseHandler.success(res, result, 'Order status updated successfully');
        } catch (error: any) {
            console.error('Update order error:', error);
            if (error.message === 'Order not found or unauthorized') {
                ResponseHandler.error(res, 'Order not found', 404);
            } else {
                ResponseHandler.error(res, error.message || 'Failed to update order status', 400);
            }
        }
    }

    static async getBookings(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const bookings = await VendorService.getVendorBookings(req.user.id);
            ResponseHandler.success(res, bookings, 'Bookings fetched successfully');
        } catch (error: any) {
            console.error('Get bookings error:', error);
            ResponseHandler.error(res, error.message || 'Failed to fetch bookings', 400);
        }
    }


    static async getRevenueReport(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const report = await VendorService.getRevenueReport(req.user.id);
            ResponseHandler.success(res, report, 'Revenue report generated successfully');
        } catch (error: any) {
            console.error('Get revenue report error:', error);
            ResponseHandler.error(res, error.message || 'Failed to generate revenue report', 400);
        }
    }
}