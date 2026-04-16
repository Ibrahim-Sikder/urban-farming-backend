
import app from './app';
import { config } from './app/config';
import prisma from './app/config/prisma';

async function startServer() {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected successfully');

        // Start server
        const server = app.listen(config.port, () => {
            console.log(`🚀 Server is running on port ${config.port}`);
            console.log(`📍 Environment: ${config.nodeEnv}`);
            console.log(`🔗 API URL: http://localhost:${config.port}`);
        });

        // Graceful shutdown
        const gracefulShutdown = async () => {
            console.log('🛑 Shutting down gracefully...');
            server.close(async () => {
                await prisma.$disconnect();
                console.log('✅ Database disconnected');
                process.exit(0);
            });
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();