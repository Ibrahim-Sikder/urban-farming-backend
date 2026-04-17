// modules/plant/plant.controller.ts
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
            const plants = await PlantService.getUserPlants(req.user!.id);
            ResponseHandler.success(res, plants, 'Plants fetched successfully');
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