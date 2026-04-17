import { Response } from 'express';
import { PlantService } from './plant.service';
import { AuthRequest } from '../../shared/middleware/auth';
import { ResponseHandler } from '../../shared/utils/response';

export class PlantController {

    static async createPlant(req: AuthRequest, res: Response): Promise<void> {
        try {
            const plant = await PlantService.createPlant(req.user!.id, req.body);
            ResponseHandler.success(res, plant, 'Plant created successfully', 201);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getUserPlants(req: AuthRequest, res: Response): Promise<void> {
        try {
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                searchTerm: req.query.searchTerm as string,
                healthStatus: req.query.healthStatus as any,
                growthStage: req.query.growthStage as any,
                plantType: req.query.plantType as string,
                minDaysOld: req.query.minDaysOld ? parseInt(req.query.minDaysOld as string) : undefined,
                maxDaysOld: req.query.maxDaysOld ? parseInt(req.query.maxDaysOld as string) : undefined,
            };

            const result = await PlantService.getUserPlants(req.user!.id, queryParams);
            ResponseHandler.success(res, result, 'Plants fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getAllPlants(req: AuthRequest, res: Response): Promise<void> {
        try {
            // Admin only
            if (req.user!.role !== 'ADMIN') {
                ResponseHandler.error(res, 'Unauthorized', 403);
                return;
            }

            const queryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                searchTerm: req.query.searchTerm as string,
                healthStatus: req.query.healthStatus as any,
                growthStage: req.query.growthStage as any,
            };

            const result = await PlantService.getAllPlants(queryParams);
            ResponseHandler.success(res, result, 'All plants fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getPlantById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const plantId = parseInt(req.params.id);
            const plant = await PlantService.getPlantById(req.user!.id, plantId);
            ResponseHandler.success(res, plant, 'Plant fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 404);
        }
    }

    static async updatePlant(req: AuthRequest, res: Response): Promise<void> {
        try {
            const plantId = parseInt(req.params.id);
            const plant = await PlantService.updatePlant(req.user!.id, plantId, req.body);
            ResponseHandler.success(res, plant, 'Plant updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async updateHealthStatus(req: AuthRequest, res: Response): Promise<void> {
        try {
            const plantId = parseInt(req.params.id);
            const plant = await PlantService.updateHealthStatus(req.user!.id, plantId, req.body);
            ResponseHandler.success(res, plant, 'Health status updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async markAsHarvested(req: AuthRequest, res: Response): Promise<void> {
        try {
            const plantId = parseInt(req.params.id);
            const plant = await PlantService.markAsHarvested(req.user!.id, plantId);
            ResponseHandler.success(res, plant, 'Plant marked as harvested successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async deletePlant(req: AuthRequest, res: Response): Promise<void> {
        try {
            const plantId = parseInt(req.params.id);
            const result = await PlantService.deletePlant(req.user!.id, plantId);
            ResponseHandler.success(res, result, 'Plant deleted successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getPlantStats(req: AuthRequest, res: Response): Promise<void> {
        try {
            const stats = await PlantService.getPlantStats(req.user!.id);
            ResponseHandler.success(res, stats, 'Plant statistics fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}