// modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ResponseHandler } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/middleware/auth';

export class AuthController {

    static async register(req: Request, res: Response): Promise<void> {
        try {
            const user = await AuthService.register({
                ...req.body,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
            ResponseHandler.success(res, user, 'User registered successfully', 201);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async login(req: Request, res: Response): Promise<void> {
        try {
            const result = await AuthService.login(
                req.body,
                req.ip,
                req.get('user-agent')
            );
            ResponseHandler.success(res, result, 'Login successful');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 401);
        }
    }

    static async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                ResponseHandler.error(res, 'Refresh token required', 400);
                return;
            }
            const result = await AuthService.refreshToken(refreshToken);
            ResponseHandler.success(res, result, 'Token refreshed successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 401);
        }
    }

    static async logout(req: AuthRequest, res: Response): Promise<void> {
        try {
            const refreshToken = req.body.refreshToken;
            const result = await AuthService.logout(req.user!.id, refreshToken);
            ResponseHandler.success(res, result, 'Logged out successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async logoutAll(req: AuthRequest, res: Response): Promise<void> {
        try {
            const result = await AuthService.logoutAll(req.user!.id);
            ResponseHandler.success(res, result, 'Logged out from all devices');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const profile = await AuthService.getProfile(req.user.id);
            ResponseHandler.success(res, profile, 'Profile fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 404);
        }
    }

    static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const updatedUser = await AuthService.updateProfile(req.user.id, req.body);
            ResponseHandler.success(res, updatedUser, 'Profile updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async changePassword(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                ResponseHandler.error(res, 'User not authenticated', 401);
                return;
            }
            const result = await AuthService.changePassword(req.user.id, req.body);
            ResponseHandler.success(res, result, 'Password changed successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async forgotPassword(req: Request, res: Response): Promise<void> {
        try {
            const result = await AuthService.forgotPassword(req.body.email, req.ip);
            ResponseHandler.success(res, result, 'Password reset email sent');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async resetPassword(req: Request, res: Response): Promise<void> {
        try {
            const result = await AuthService.resetPassword(
                req.body.token,
                req.body.newPassword,
                req.ip
            );
            ResponseHandler.success(res, result, 'Password reset successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const filters = {
                role: req.query.role as string,
                status: req.query.status as string,
                search: req.query.search as string,
            };

            const result = await AuthService.getAllUsers(page, limit, filters);
            ResponseHandler.success(res, result, 'Users fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                ResponseHandler.error(res, 'Invalid user ID', 400);
                return;
            }
            const user = await AuthService.updateUserStatus(userId, req.body.status, req.user!.id);
            ResponseHandler.success(res, user, 'User status updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async deleteUser(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                ResponseHandler.error(res, 'Invalid user ID', 400);
                return;
            }
            const result = await AuthService.deleteUser(userId, req.user!.id);
            ResponseHandler.success(res, result, 'User deleted successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}