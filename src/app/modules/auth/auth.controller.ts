import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ResponseHandler } from '@/app/shared/utils/response';


export class AuthController {
    static async register(req: Request, res: Response) {
        try {
            const user = await AuthService.register(req.body);
            ResponseHandler.success(res, user, 'User registered successfully', 201);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async login(req: Request, res: Response) {
        try {
            const result = await AuthService.login(req.body);
            ResponseHandler.success(res, result, 'Login successful');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 401);
        }
    }
}