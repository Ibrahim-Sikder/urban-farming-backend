import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ResponseHandler } from '../utils/response';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('Error:', err);

    // Prisma Errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002':
                return ResponseHandler.error(
                    res,
                    `Duplicate entry: ${err.meta?.target}`,
                    409,
                    err
                );
            case 'P2025':
                return ResponseHandler.error(res, 'Record not found', 404, err);
            case 'P2003':
                return ResponseHandler.error(res, 'Foreign key constraint failed', 400, err);
            default:
                return ResponseHandler.error(res, 'Database error', 400, err);
        }
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
        return ResponseHandler.error(res, 'Invalid data provided', 400, err);
    }

    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
        return ResponseHandler.error(res, 'Invalid token', 401);
    }

    if (err.name === 'TokenExpiredError') {
        return ResponseHandler.error(res, 'Token expired', 401);
    }

    // Default Error
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    ResponseHandler.error(res, message, statusCode, err);
};