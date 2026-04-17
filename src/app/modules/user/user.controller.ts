import { Response } from 'express';
import { UserService } from './user.service';
import { AuthRequest } from '../../shared/middleware/auth';
import { ResponseHandler } from '../../shared/utils/response';

export class UserController {

    static async getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
        try {
            const stats = await UserService.getDashboardStats(req.user!.id);
            ResponseHandler.success(res, stats, 'Dashboard stats fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getOrders(req: AuthRequest, res: Response): Promise<void> {
        try {
            const params = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                status: req.query.status as any,
                startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
            };
            const result = await UserService.getOrders(req.user!.id, params);
            ResponseHandler.success(res, result, 'Orders fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getOrderById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const orderId = parseInt(req.params.id);
            const order = await UserService.getOrderById(req.user!.id, orderId);
            if (!order) {
                ResponseHandler.error(res, 'Order not found', 404);
                return;
            }
            ResponseHandler.success(res, order, 'Order fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getRentals(req: AuthRequest, res: Response): Promise<void> {
        try {
            const params = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                status: req.query.status as any,
            };
            const rentals = await UserService.getRentals(req.user!.id, params);
            ResponseHandler.success(res, rentals, 'Rentals fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getRentalById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const rentalId = parseInt(req.params.id);
            const rental = await UserService.getRentalById(req.user!.id, rentalId);
            if (!rental) {
                ResponseHandler.error(res, 'Rental not found', 404);
                return;
            }
            ResponseHandler.success(res, rental, 'Rental fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getPlants(req: AuthRequest, res: Response): Promise<void> {
        try {
            const params = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                healthStatus: req.query.healthStatus as string,
                growthStage: req.query.growthStage as string,
            };
            const plants = await UserService.getPlants(req.user!.id, params);
            ResponseHandler.success(res, plants, 'Plants fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getPlantById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const plantId = parseInt(req.params.id);
            const plant = await UserService.getPlantById(req.user!.id, plantId);
            if (!plant) {
                ResponseHandler.error(res, 'Plant not found', 404);
                return;
            }
            ResponseHandler.success(res, plant, 'Plant fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}