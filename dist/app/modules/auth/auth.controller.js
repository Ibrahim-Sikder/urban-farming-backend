"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const response_1 = require("../../shared/utils/response");
class AuthController {
    static async register(req, res) {
        try {
            const user = await auth_service_1.AuthService.register({
                ...req.body,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
            response_1.ResponseHandler.success(res, user, 'User registered successfully', 201);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async login(req, res) {
        try {
            const result = await auth_service_1.AuthService.login(req.body, req.ip, req.get('user-agent'));
            response_1.ResponseHandler.success(res, result, 'Login successful');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 401);
        }
    }
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                response_1.ResponseHandler.error(res, 'Refresh token required', 400);
                return;
            }
            const result = await auth_service_1.AuthService.refreshToken(refreshToken);
            response_1.ResponseHandler.success(res, result, 'Token refreshed successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 401);
        }
    }
    static async logout(req, res) {
        try {
            const refreshToken = req.body.refreshToken;
            const result = await auth_service_1.AuthService.logout(req.user.id, refreshToken);
            response_1.ResponseHandler.success(res, result, 'Logged out successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async logoutAll(req, res) {
        try {
            const result = await auth_service_1.AuthService.logoutAll(req.user.id);
            response_1.ResponseHandler.success(res, result, 'Logged out from all devices');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getProfile(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const profile = await auth_service_1.AuthService.getProfile(req.user.id);
            response_1.ResponseHandler.success(res, profile, 'Profile fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 404);
        }
    }
    static async updateProfile(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const updatedUser = await auth_service_1.AuthService.updateProfile(req.user.id, req.body);
            response_1.ResponseHandler.success(res, updatedUser, 'Profile updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async changePassword(req, res) {
        try {
            if (!req.user) {
                response_1.ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const result = await auth_service_1.AuthService.changePassword(req.user.id, req.body);
            response_1.ResponseHandler.success(res, result, 'Password changed successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async forgotPassword(req, res) {
        try {
            const result = await auth_service_1.AuthService.forgotPassword(req.body.email, req.ip);
            response_1.ResponseHandler.success(res, result, 'Password reset email sent');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async resetPassword(req, res) {
        try {
            const result = await auth_service_1.AuthService.resetPassword(req.body.token, req.body.newPassword, req.ip);
            response_1.ResponseHandler.success(res, result, 'Password reset successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getAllUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const filters = {
                role: req.query.role,
                status: req.query.status,
                search: req.query.search,
            };
            const result = await auth_service_1.AuthService.getAllUsers(page, limit, filters);
            response_1.ResponseHandler.success(res, result, 'Users fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async updateUserStatus(req, res) {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                response_1.ResponseHandler.error(res, 'Invalid user ID', 400);
                return;
            }
            const user = await auth_service_1.AuthService.updateUserStatus(userId, req.body.status, req.user.id);
            response_1.ResponseHandler.success(res, user, 'User status updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async deleteUser(req, res) {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                response_1.ResponseHandler.error(res, 'Invalid user ID', 400);
                return;
            }
            const result = await auth_service_1.AuthService.deleteUser(userId, req.user.id);
            response_1.ResponseHandler.success(res, result, 'User deleted successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map