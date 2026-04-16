// modules/user/user.controller.ts
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
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const result = await UserService.getOrders(req.user!.id, page, limit);
            ResponseHandler.success(res, result, 'Orders fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getRentals(req: AuthRequest, res: Response): Promise<void> {
        try {
            const rentals = await UserService.getRentals(req.user!.id);
            ResponseHandler.success(res, rentals, 'Rentals fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getPlants(req: AuthRequest, res: Response): Promise<void> {
        try {
            const plants = await UserService.getPlants(req.user!.id);
            ResponseHandler.success(res, plants, 'Plants fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}