"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("./user.service");
const response_1 = require("../../shared/utils/response");
class UserController {
    static async getDashboardStats(req, res) {
        try {
            const stats = await user_service_1.UserService.getDashboardStats(req.user.id);
            response_1.ResponseHandler.success(res, stats, 'Dashboard stats fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getOrders(req, res) {
        try {
            const params = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                status: req.query.status,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            };
            const result = await user_service_1.UserService.getOrders(req.user.id, params);
            response_1.ResponseHandler.success(res, result, 'Orders fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getOrderById(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            const order = await user_service_1.UserService.getOrderById(req.user.id, orderId);
            if (!order) {
                response_1.ResponseHandler.error(res, 'Order not found', 404);
                return;
            }
            response_1.ResponseHandler.success(res, order, 'Order fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getRentals(req, res) {
        try {
            const params = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                status: req.query.status,
            };
            const rentals = await user_service_1.UserService.getRentals(req.user.id, params);
            response_1.ResponseHandler.success(res, rentals, 'Rentals fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getRentalById(req, res) {
        try {
            const rentalId = parseInt(req.params.id);
            const rental = await user_service_1.UserService.getRentalById(req.user.id, rentalId);
            if (!rental) {
                response_1.ResponseHandler.error(res, 'Rental not found', 404);
                return;
            }
            response_1.ResponseHandler.success(res, rental, 'Rental fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getPlants(req, res) {
        try {
            const params = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                healthStatus: req.query.healthStatus,
                growthStage: req.query.growthStage,
            };
            const plants = await user_service_1.UserService.getPlants(req.user.id, params);
            response_1.ResponseHandler.success(res, plants, 'Plants fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getPlantById(req, res) {
        try {
            const plantId = parseInt(req.params.id);
            const plant = await user_service_1.UserService.getPlantById(req.user.id, plantId);
            if (!plant) {
                response_1.ResponseHandler.error(res, 'Plant not found', 404);
                return;
            }
            response_1.ResponseHandler.success(res, plant, 'Plant fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map