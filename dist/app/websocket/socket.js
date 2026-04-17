"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketManager = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const prisma_1 = __importDefault(require("../config/prisma"));
class WebSocketManager {
    static io;
    static initialize(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: config_1.config.cors?.origin || '*',
                credentials: true,
                methods: ['GET', 'POST'],
            },
            pingTimeout: 60000,
        });
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication required'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
                const user = await prisma_1.default.user.findUnique({
                    where: { id: decoded.id, status: 'ACTIVE' },
                    select: { id: true, role: true },
                });
                if (!user) {
                    return next(new Error('User not found or inactive'));
                }
                socket.userId = user.id;
                next();
            }
            catch (error) {
                next(new Error('Invalid token'));
            }
        });
        this.io.on('connection', (socket) => {
            console.log(`🔌 Client connected: ${socket.id}, User: ${socket.userId}`);
            if (socket.userId) {
                socket.join(`user:${socket.userId}`);
            }
            socket.on('track:plant', (plantId) => {
                socket.join(`plant:${plantId}`);
                console.log(`User ${socket.userId} started tracking plant ${plantId}`);
            });
            socket.on('untrack:plant', (plantId) => {
                socket.leave(`plant:${plantId}`);
                console.log(`User ${socket.userId} stopped tracking plant ${plantId}`);
            });
            socket.on('plant:health:update', async (data) => {
                try {
                    const { plantId, healthStatus, growthStage, notes } = data;
                    const plant = await prisma_1.default.plantTracking.findFirst({
                        where: {
                            id: plantId,
                            userId: socket.userId,
                        },
                    });
                    if (plant) {
                        const updated = await prisma_1.default.plantTracking.update({
                            where: { id: plantId },
                            data: { healthStatus, growthStage, notes },
                        });
                        this.io.to(`plant:${plantId}`).emit('plant:updated', updated);
                    }
                }
                catch (error) {
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
exports.WebSocketManager = WebSocketManager;
//# sourceMappingURL=socket.js.map