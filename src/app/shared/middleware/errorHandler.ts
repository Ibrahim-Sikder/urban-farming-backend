import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { config } from '../../config';

interface ErrorWithStatus extends Error {
    statusCode?: number;
    status?: string;
    isOperational?: boolean;
}

const globalErrorHandler = (
    err: ErrorWithStatus,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Prisma specific errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002':
                statusCode = 409;
                message = `Duplicate entry error: ${err.meta?.target}`;
                break;
            case 'P2025':
                statusCode = 404;
                message = 'Record not found';
                break;
            case 'P2003':
                statusCode = 400;
                message = 'Foreign key constraint failed';
                break;
            default:
                statusCode = 400;
                message = `Database error: ${err.message}`;
        }
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = 'Invalid data provided';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Send response
    res.status(statusCode).json({
        success: false,
        message,
        statusCode,
        error: config.nodeEnv === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
    });
};

export default globalErrorHandler;