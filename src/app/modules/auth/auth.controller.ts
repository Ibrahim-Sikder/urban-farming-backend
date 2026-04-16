import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ResponseHandler } from '../../utils/response';
import { AuthRequest } from '../../middlewares/auth';

export class AuthController {

    // Register new user
    static async register(req: Request, res: Response) {
        try {
            const user = await AuthService.register(req.body);
            ResponseHandler.success(res, user, 'User registered successfully', 201);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // Login user
    static async login(req: Request, res: Response) {
        try {
            const result = await AuthService.login(req.body);
            ResponseHandler.success(res, result, 'Login successful');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 401);
        }
    }

    // Get current user profile
    static async getProfile(req: AuthRequest, res: Response) {
        try {
            const profile = await AuthService.getProfile(req.user!.id);
            ResponseHandler.success(res, profile, 'Profile fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 404);
        }
    }

    // Update profile
    static async updateProfile(req: AuthRequest, res: Response) {
        try {
            const updatedUser = await AuthService.updateProfile(req.user!.id, req.body);
            ResponseHandler.success(res, updatedUser, 'Profile updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // Change password
    static async changePassword(req: AuthRequest, res: Response) {
        try {
            const result = await AuthService.changePassword(req.user!.id, req.body);
            ResponseHandler.success(res, result, 'Password changed successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // Forgot password
    static async forgotPassword(req: Request, res: Response) {
        try {
            const result = await AuthService.forgotPassword(req.body.email);
            ResponseHandler.success(res, result, 'Password reset email sent');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // Reset password
    static async resetPassword(req: Request, res: Response) {
        try {
            const result = await AuthService.resetPassword(req.body.token, req.body.newPassword);
            ResponseHandler.success(res, result, 'Password reset successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // Get all users (Admin only)
    static async getAllUsers(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const filters = {
                role: req.query.role as string,
                status: req.query.status as string,
                search: req.query.search as string,
            };

            const result = await AuthService.getAllUsers(page, limit, filters);
            ResponseHandler.paginated(res, result.users, result.total, result.page, result.limit, 'Users fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // Update user status (Admin only)
    static async updateUserStatus(req: Request, res: Response) {
        try {
            const user = await AuthService.updateUserStatus(parseInt(req.params.id), req.body.status);
            ResponseHandler.success(res, user, 'User status updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // Delete user (Admin only)
    static async deleteUser(req: Request, res: Response) {
        try {
            const result = await AuthService.deleteUser(parseInt(req.params.id));
            ResponseHandler.success(res, result, 'User deleted successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}