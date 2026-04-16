"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const response_1 = require("../utils/response");
const config_1 = require("../../config");
const prisma_1 = __importDefault(require("../../config/prisma"));
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            response_1.ResponseHandler.error(res, 'No token provided', 401);
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.id, status: 'ACTIVE' },
            select: { id: true, email: true, role: true },
        });
        if (!user) {
            response_1.ResponseHandler.error(res, 'User not found or inactive', 401);
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError') {
            response_1.ResponseHandler.error(res, 'Invalid token', 401);
            return;
        }
        if (error.name === 'TokenExpiredError') {
            response_1.ResponseHandler.error(res, 'Token expired', 401);
            return;
        }
        response_1.ResponseHandler.error(res, 'Authentication failed', 401);
        return;
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            response_1.ResponseHandler.error(res, 'Unauthorized', 401);
            return;
        }
        if (!roles.includes(req.user.role)) {
            response_1.ResponseHandler.error(res, 'Access denied. Insufficient permissions', 403);
            return;
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.js.map