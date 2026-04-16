import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ResponseHandler } from '../utils/response';
import { config } from '@/app/config';
import prisma from '@/app/config/prisma';

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
) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return ResponseHandler.error(res, 'No token provided', 401);
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
            return ResponseHandler.error(res, 'User not found or inactive', 401);
        }

        req.user = user;
        next();
    } catch (error: any) {
        if (error.name === 'JsonWebTokenError') {
            return ResponseHandler.error(res, 'Invalid token', 401);
        }
        if (error.name === 'TokenExpiredError') {
            return ResponseHandler.error(res, 'Token expired', 401);
        }
        return ResponseHandler.error(res, 'Authentication failed', 401);
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return ResponseHandler.error(res, 'Unauthorized', 401);
        }

        if (!roles.includes(req.user.role)) {
            return ResponseHandler.error(res, 'Access denied. Insufficient permissions', 403);
        }

        next();
    };
};