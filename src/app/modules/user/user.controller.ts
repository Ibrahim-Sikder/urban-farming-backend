import { Response } from 'express';
import { UserService } from './user.service';
import { AuthRequest } from '@/app/shared/middleware/auth';
import { ResponseHandler } from '@/app/shared/utils/response';


export class UserController {

    // Get user dashboard stats
    static async getDashboardStats(req: AuthRequest, res: Response) {
        try {
            const stats = await UserService.getDashboardStats(req.user!.id);
            ResponseHandler.success(res, stats, 'Dashboard stats fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // Get user orders history
    static async getOrders(req: AuthRequest, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const orders = await UserService.getOrders(req.user!.id, page, limit);
            ResponseHandler.success(res, orders, 'Orders fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // Get user rentals
    static async getRentals(req: AuthRequest, res: Response) {
        try {
            const rentals = await UserService.getRentals(req.user!.id);
            ResponseHandler.success(res, rentals, 'Rentals fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // Get user plants
    static async getPlants(req: AuthRequest, res: Response) {
        try {
            const plants = await UserService.getPlants(req.user!.id);
            ResponseHandler.success(res, plants, 'Plants fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}