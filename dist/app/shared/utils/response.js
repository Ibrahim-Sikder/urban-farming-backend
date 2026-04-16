"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseHandler = void 0;
class ResponseHandler {
    static success(res, data, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
        });
    }
    static error(res, message = 'Internal Server Error', statusCode = 500, error) {
        return res.status(statusCode).json({
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? error : undefined,
            timestamp: new Date().toISOString(),
        });
    }
    static paginated(res, items, total, page, limit, message = 'Success') {
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
        }, message);
    }
}
exports.ResponseHandler = ResponseHandler;
//# sourceMappingURL=response.js.map