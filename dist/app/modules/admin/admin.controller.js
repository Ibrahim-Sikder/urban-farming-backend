"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("./admin.service");
const response_1 = require("../../shared/utils/response");
class AdminController {
    static async getDashboardStats(req, res) {
        try {
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined
            };
            const stats = await admin_service_1.AdminService.getDashboardStats(filters);
            response_1.ResponseHandler.success(res, stats, 'Dashboard stats fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getAllUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const role = req.query.role;
            const status = req.query.status;
            const result = await admin_service_1.AdminService.getAllUsers(page, limit, role, status);
            response_1.ResponseHandler.success(res, result, 'Users fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async updateUserStatus(req, res) {
        try {
            const userId = parseInt(req.params.id);
            const result = await admin_service_1.AdminService.updateUserStatus(userId, req.body.status);
            response_1.ResponseHandler.success(res, result, 'User status updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async deleteUser(req, res) {
        try {
            const userId = parseInt(req.params.id);
            const result = await admin_service_1.AdminService.deleteUser(userId);
            response_1.ResponseHandler.success(res, result, 'User deleted successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getAllVendors(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status;
            const result = await admin_service_1.AdminService.getAllVendors(page, limit, status);
            response_1.ResponseHandler.success(res, result, 'Vendors fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async verifyVendor(req, res) {
        try {
            const vendorId = parseInt(req.params.id);
            const result = await admin_service_1.AdminService.verifyVendor(vendorId, req.body.status, req.body.rejectionReason);
            response_1.ResponseHandler.success(res, result, 'Vendor verified successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getAllCertifications(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status;
            const result = await admin_service_1.AdminService.getAllCertifications(page, limit, status);
            response_1.ResponseHandler.success(res, result, 'Certifications fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async verifyCertification(req, res) {
        try {
            const certId = parseInt(req.params.id);
            const result = await admin_service_1.AdminService.verifyCertification(certId, req.body.status, req.body.verificationNotes);
            response_1.ResponseHandler.success(res, result, 'Certification verified successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getAllRentalSpaces(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await admin_service_1.AdminService.getAllRentalSpaces(page, limit);
            response_1.ResponseHandler.success(res, result, 'Rental spaces fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getAllOrders(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status;
            const result = await admin_service_1.AdminService.getAllOrders(page, limit, status);
            response_1.ResponseHandler.success(res, result, 'Orders fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
}
exports.AdminController = AdminController;
//# sourceMappingURL=admin.controller.js.map