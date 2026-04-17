import dotenv from 'dotenv';
import path from 'path';
import http from 'http';  // Add this

// Load .env first
dotenv.config({ path: path.join(__dirname, '../.env') });

import app from './app';
import { config } from './app/config';
import prisma from './app/config/prisma';
import RedisConfig from './app/config/redis';
import socketService from './app/services/socket.service';  // Add this

async function startServer() {
    console.log('\n🚀 Starting Urban Farming Backend...\n');

    try {
        // Test database connection
        console.log('🔄 Connecting to database...');
        const connectionPromise = prisma.$connect();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Database connection timeout after 10 seconds')), 10000);
        });

        await Promise.race([connectionPromise, timeoutPromise]);
        console.log('✅ Database connected successfully');

        // Test Redis connection
        console.log('🔄 Connecting to Redis...');
        const isRedisHealthy = await RedisConfig.healthCheck();
        if (isRedisHealthy) {
            console.log('✅ Redis connected and ready');
        } else {
            console.log('⚠️ Redis connection failed - Caching will not work');
        }

        // Create HTTP server from Express app
        const server = http.createServer(app);  // Add this line

        // Initialize Socket.IO
        console.log('🔄 Initializing WebSocket server...');
        socketService.initialize(server);
        console.log('✅ WebSocket server ready');

        // Start server
        server.listen(config.port, () => {  // Change app.listen to server.listen
            console.log(`\n🚀 Server is running on port ${config.port}`);
            console.log(`📍 Environment: ${config.nodeEnv}`);
            console.log(`🔗 API URL: http://localhost:${config.port}`);
            console.log(`🔌 WebSocket URL: ws://localhost:${config.port}`);
            console.log(`📚 API Docs: http://localhost:${config.port}/api-docs\n`);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
            server.close(async () => {
                console.log('📡 HTTP server closed');
                await socketService.close();  // Add this
                console.log('🔌 WebSocket server closed');
                await prisma.$disconnect();
                console.log('🗄️  Database disconnected');
                await RedisConfig.disconnect();
                console.log('📦 Redis disconnected');
                console.log('✅ Graceful shutdown completed');
                process.exit(0);
            });

            setTimeout(() => {
                console.error('⚠️ Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error: any) {
        console.error('\n❌ Failed to start server:');

        if (error.code === 'P1000') {
            console.error('\n📋 Database Connection Error:');
            console.error('   Authentication failed. Please check your database credentials.');
            console.error('\n🔧 Troubleshooting steps:');
            console.error('   1. Verify your DATABASE_URL in .env file');
            console.error('   2. Check if PostgreSQL is running');
            console.error('   3. Try running: npx prisma db push');
        } else if (error.code === 'P1001') {
            console.error('\n📋 Database Connection Error:');
            console.error('   Cannot reach database server. Please check if the database is running.');
        } else {
            console.error('   ', error.message);
        }

        console.error('\n💡 Tip: Make sure your .env file has the correct DATABASE_URL');
        process.exit(1);
    }
}

startServer();