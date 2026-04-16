import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ResponseHandler } from '../utils/response';
import { config } from '../../config';
import prisma from '../../config/prisma';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        role: string;
    };
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            ResponseHandler.error(res, 'No token provided', 401);
            return;
        }

        const decoded = jwt.verify(token, config.jwt.secret) as {
            id: number;
            email: string;
            role: string;
        };

        const user = await prisma.user.findUnique({
            where: { id: decoded.id, status: 'ACTIVE' },
            select: { id: true, email: true, role: true },
        });

        if (!user) {
            ResponseHandler.error(res, 'User not found or inactive', 401);
            return;
        }

        req.user = user;
        next();
    } catch (error: any) {
        if (error.name === 'JsonWebTokenError') {
            ResponseHandler.error(res, 'Invalid token', 401);
            return;
        }
        if (error.name === 'TokenExpiredError') {
            ResponseHandler.error(res, 'Token expired', 401);
            return;
        }
        ResponseHandler.error(res, 'Authentication failed', 401);
        return;
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            ResponseHandler.error(res, 'Unauthorized', 401);
            return;
        }

        if (!roles.includes(req.user.role)) {
            ResponseHandler.error(res, 'Access denied. Insufficient permissions', 403);
            return;
        }

        next();
    };
};