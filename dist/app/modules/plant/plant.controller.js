"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlantController = void 0;
const plant_service_1 = require("./plant.service");
const response_1 = require("../../shared/utils/response");
class PlantController {
    static async createPlant(req, res) {
        try {
            const plant = await plant_service_1.PlantService.createPlant(req.user.id, req.body);
            response_1.ResponseHandler.success(res, plant, 'Plant created successfully', 201);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getUserPlants(req, res) {
        try {
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                searchTerm: req.query.searchTerm,
                healthStatus: req.query.healthStatus,
                growthStage: req.query.growthStage,
                plantType: req.query.plantType,
                minDaysOld: req.query.minDaysOld ? parseInt(req.query.minDaysOld) : undefined,
                maxDaysOld: req.query.maxDaysOld ? parseInt(req.query.maxDaysOld) : undefined,
            };
            const result = await plant_service_1.PlantService.getUserPlants(req.user.id, queryParams);
            response_1.ResponseHandler.success(res, result, 'Plants fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getAllPlants(req, res) {
        try {
            if (req.user.role !== 'ADMIN') {
                response_1.ResponseHandler.error(res, 'Unauthorized', 403);
                return;
            }
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                searchTerm: req.query.searchTerm,
                healthStatus: req.query.healthStatus,
                growthStage: req.query.growthStage,
            };
            const result = await plant_service_1.PlantService.getAllPlants(queryParams);
            response_1.ResponseHandler.success(res, result, 'All plants fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getPlantById(req, res) {
        try {
            const plantId = parseInt(req.params.id);
            const plant = await plant_service_1.PlantService.getPlantById(req.user.id, plantId);
            response_1.ResponseHandler.success(res, plant, 'Plant fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 404);
        }
    }
    static async updatePlant(req, res) {
        try {
            const plantId = parseInt(req.params.id);
            const plant = await plant_service_1.PlantService.updatePlant(req.user.id, plantId, req.body);
            response_1.ResponseHandler.success(res, plant, 'Plant updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async updateHealthStatus(req, res) {
        try {
            const plantId = parseInt(req.params.id);
            const plant = await plant_service_1.PlantService.updateHealthStatus(req.user.id, plantId, req.body);
            response_1.ResponseHandler.success(res, plant, 'Health status updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async markAsHarvested(req, res) {
        try {
            const plantId = parseInt(req.params.id);
            const plant = await plant_service_1.PlantService.markAsHarvested(req.user.id, plantId);
            response_1.ResponseHandler.success(res, plant, 'Plant marked as harvested successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async deletePlant(req, res) {
        try {
            const plantId = parseInt(req.params.id);
            const result = await plant_service_1.PlantService.deletePlant(req.user.id, plantId);
            response_1.ResponseHandler.success(res, result, 'Plant deleted successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getPlantStats(req, res) {
        try {
            const stats = await plant_service_1.PlantService.getPlantStats(req.user.id);
            response_1.ResponseHandler.success(res, stats, 'Plant statistics fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
}
exports.PlantController = PlantController;
//# sourceMappingURL=plant.controller.js.map