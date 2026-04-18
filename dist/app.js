"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const config_1 = require("./app/config");
const rateLimiter_1 = require("./app/shared/middleware/rateLimiter");
const notFound_1 = require("./app/shared/middleware/notFound");
const routes_1 = __importDefault(require("./app/routes"));
const globalErrorHandler_1 = __importDefault(require("./app/shared/middleware/globalErrorHandler"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: config_1.config.cors.origin, credentials: true }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
app.use(rateLimiter_1.globalLimiter);
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'Urban Farming API is running',
        timestamp: new Date().toISOString(),
        environment: config_1.config.nodeEnv,
    });
});
app.use('/api/v1', routes_1.default);
app.use(notFound_1.notFound);
app.use(globalErrorHandler_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map