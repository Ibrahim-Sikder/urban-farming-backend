import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

import prisma from '../config/prisma';
import { config } from '../config';


interface SocketWithUser extends Socket {
    userId?: number;
}

export class WebSocketManager {
    private static io: SocketServer;

    static initialize(server: HttpServer) {
        this.io = new SocketServer(server, {
            cors: {
                origin: config.cors.origin,
                credentials: true,
                methods: ['GET', 'POST'],
            },
            pingTimeout: 60000,
        });

        // Authentication middleware
        this.io.use(async (socket: SocketWithUser, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication required'));
                }

                const decoded = jwt.verify(token, config.jwt.secret) as { id: number };
                const user = await prisma.user.findUnique({
                    where: { id: decoded.id, status: 'ACTIVE' },
                    select: { id: true, role: true },
                });

                if (!user) {
                    return next(new Error('User not found or inactive'));
                }

                socket.userId = user.id;
                next();
            } catch (error) {
                next(new Error('Invalid token'));
            }
        });

        this.io.on('connection', (socket: SocketWithUser) => {
            console.log(`🔌 Client connected: ${socket.id}, User: ${socket.userId}`);

            // Join user's personal room
            if (socket.userId) {
                socket.join(`user:${socket.userId}`);
            }

            // Plant tracking
            socket.on('track:plant', (plantId: number) => {
                socket.join(`plant:${plantId}`);
                console.log(`User ${socket.userId} started tracking plant ${plantId}`);
            });

            socket.on('untrack:plant', (plantId: number) => {
                socket.leave(`plant:${plantId}`);
                console.log(`User ${socket.userId} stopped tracking plant ${plantId}`);
            });

            // Real-time plant health update
            socket.on('plant:health:update', async (data) => {
                try {
                    const { plantId, healthStatus, growthStage, notes } = data;

                    // Verify permission
                    const plant = await prisma.plantTracking.findFirst({
                        where: {
                            id: plantId,
                            user: { id: socket.userId },
                        },
                    });

                    if (plant) {
                        const updated = await prisma.plantTracking.update({
                            where: { id: plantId },
                            data: { healthStatus, growthStage, notes },
                        });

                        // Add growth log
                        await prisma.growthLog.create({
                            data: {
                                plantId,
                                healthStatus,
                                growthStage,
                                notes,
                            },
                        });

                        // Broadcast to all trackers
                        this.io.to(`plant:${plantId}`).emit('plant:updated', updated);
                    }
                } catch (error) {
                    console.error('Plant update error:', error);
                    socket.emit('error', { message: 'Failed to update plant' });
                }
            });

            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
            });
        });

        return this.io;
    }

    static getIO() {
        if (!this.io) {
            throw new Error('WebSocket not initialized');
        }
        return this.io;
    }
}