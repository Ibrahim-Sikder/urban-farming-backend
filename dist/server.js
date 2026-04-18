"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./app/config");
const prisma_1 = __importDefault(require("./app/config/prisma"));
const redis_1 = __importDefault(require("./app/config/redis"));
const socket_service_1 = __importDefault(require("./app/services/socket.service"));
async function startServer() {
    console.log('\n Starting Urban Farming Backend...\n');
    try {
        console.log(' Connecting to database...');
        const connectionPromise = prisma_1.default.$connect();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Database connection timeout after 10 seconds')), 10000);
        });
        await Promise.race([connectionPromise, timeoutPromise]);
        console.log(' Database connected successfully');
        console.log('Connecting to Redis...');
        const isRedisHealthy = await redis_1.default.healthCheck();
        if (isRedisHealthy) {
            console.log(' Redis connected and ready');
        }
        else {
            console.log('⚠️ Redis connection failed - Caching will not work');
        }
        const server = http_1.default.createServer(app_1.default);
        console.log(' Initializing WebSocket server...');
        socket_service_1.default.initialize(server);
        console.log(' WebSocket server ready');
        server.listen(config_1.config.port, () => {
            console.log(`\n Server is running on port ${config_1.config.port}`);
            console.log(` Environment: ${config_1.config.nodeEnv}`);
            console.log(` API URL: http://localhost:${config_1.config.port}`);
            console.log(` WebSocket URL: ws://localhost:${config_1.config.port}`);
            console.log(` API Docs: http://localhost:${config_1.config.port}/api-docs\n`);
        });
        const gracefulShutdown = async (signal) => {
            console.log(`\n Received ${signal}, shutting down gracefully...`);
            server.close(async () => {
                console.log(' HTTP server closed');
                await socket_service_1.default.close();
                console.log(' WebSocket server closed');
                await prisma_1.default.$disconnect();
                console.log('  Database disconnected');
                await redis_1.default.disconnect();
                console.log(' Redis disconnected');
                console.log(' Graceful shutdown completed');
                process.exit(0);
            });
            setTimeout(() => {
                console.error(' Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
    catch (error) {
        console.error('\n Failed to start server:');
        if (error.code === 'P1000') {
            console.error('\n Database Connection Error:');
            console.error('   Authentication failed. Please check your database credentials.');
            console.error('\n Troubleshooting steps:');
            console.error('   1. Verify your DATABASE_URL in .env file');
            console.error('   2. Check if PostgreSQL is running');
            console.error('   3. Try running: npx prisma db push');
        }
        else if (error.code == 'P1001') {
            console.error('\n Database Connection Error:');
            console.error('   Cannot reach database server. Please check if the database is running.');
        }
        else {
            console.error('   ', error.message);
        }
        console.error('\n Tip: Make sure your .env file has the correct DATABASE_URL');
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map