"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./app/config");
const prisma_1 = __importDefault(require("./app/config/prisma"));
async function startServer() {
    try {
        await prisma_1.default.$connect();
        console.log('✅ Database connected successfully');
        const server = app_1.default.listen(config_1.config.port, () => {
            console.log(`🚀 Server is running on port ${config_1.config.port}`);
            console.log(`📍 Environment: ${config_1.config.nodeEnv}`);
            console.log(`🔗 API URL: http://localhost:${config_1.config.port}`);
        });
        const gracefulShutdown = async () => {
            console.log('🛑 Shutting down gracefully...');
            server.close(async () => {
                await prisma_1.default.$disconnect();
                console.log('✅ Database disconnected');
                process.exit(0);
            });
        };
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map