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
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await user_service_1.UserService.getOrders(req.user.id, page, limit);
            response_1.ResponseHandler.success(res, result, 'Orders fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getRentals(req, res) {
        try {
            const rentals = await user_service_1.UserService.getRentals(req.user.id);
            response_1.ResponseHandler.success(res, rentals, 'Rentals fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getPlants(req, res) {
        try {
            const plants = await user_service_1.UserService.getPlants(req.user.id);
            response_1.ResponseHandler.success(res, plants, 'Plants fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map