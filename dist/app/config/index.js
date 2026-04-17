"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../../.env') });
exports.config = {
    port: parseInt(process.env.PORT || '5000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL,
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    },
};
if (!exports.config.jwt.secret) {
    throw new Error('JWT_SECRET is required in .env file');
}
if (!exports.config.databaseUrl) {
    throw new Error('DATABASE_URL is required in .env file');
}
console.log('✅ Config loaded successfully');
console.log(`📦 Environment: ${exports.config.nodeEnv}`);
//# sourceMappingURL=index.js.map