import { Request, Response, NextFunction } from 'express';
import { ResponseHandler } from '../utils/response';

interface RateLimitOptions {
    windowMs: number;
    max: number;
}

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

const requestCounts = new Map<string, RateLimitRecord>();

export const rateLimit = (options: RateLimitOptions) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Get client IP with proper type handling
        let key: string;
        const xForwardedFor = req.headers['x-forwarded-for'];

        if (typeof xForwardedFor === 'string') {
            key = xForwardedFor.split(',')[0].trim();
        } else if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
            key = xForwardedFor[0];
        } else if (req.ip) {
            key = req.ip;
        } else {
            key = 'unknown';
        }

        const now = Date.now();
        const record = requestCounts.get(key);

        if (record) {
            if (now > record.resetTime) {
                // Reset window
                requestCounts.set(key, {
                    count: 1,
                    resetTime: now + options.windowMs,
                });
                next();
            } else if (record.count < options.max) {
                // Increment count
                record.count++;
                requestCounts.set(key, record);
                next();
            } else {
                // Rate limit exceeded
                ResponseHandler.error(
                    res,
                    'Too many requests, please try again later.',
                    429
                );
            }
        } else {
            // First request
            requestCounts.set(key, {
                count: 1,
                resetTime: now + options.windowMs,
            });
            next();
        }
    };
};