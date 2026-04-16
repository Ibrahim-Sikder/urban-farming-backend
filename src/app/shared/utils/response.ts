import { Response } from 'express';

export class ResponseHandler {
    static success(res: Response, data: any, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
        });
    }

    static error(res: Response, message = 'Internal Server Error', statusCode = 500, error?: any) {
        return res.status(statusCode).json({
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? error : undefined,
            timestamp: new Date().toISOString(),
        });
    }

    static paginated(res: Response, items: any[], total: number, page: number, limit: number) {
        const totalPages = Math.ceil(total / limit);
        return this.success(res, {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        });
    }
}