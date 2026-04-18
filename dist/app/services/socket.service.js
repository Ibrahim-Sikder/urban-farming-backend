"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
class SocketService {
    io = null;
    connectedUsers = new Map();
    initialize(httpServer) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: config_1.config.cors.origin,
                credentials: true
            },
            pingTimeout: 60000,
            pingInterval: 25000
        });
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication error: No token provided'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
                socket.data.userId = decoded.id;
                socket.data.role = decoded.role;
                next();
            }
            catch (err) {
                next(new Error('Authentication error: Invalid token'));
            }
        });
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }
    handleConnection(socket) {
        const userId = socket.data.userId;
        const role = socket.data.role;
        this.connectedUsers.set(userId, {
            userId,
            role,
            socketId: socket.id
        });
        console.log(`✅ User ${userId} (${role}) connected | Total connected: ${this.connectedUsers.size}`);
        socket.join(`role:${role}`);
        socket.join(`user:${userId}`);
        socket.emit('connection:confirmed', {
            userId,
            role,
            message: 'Connected to WebSocket server',
            timestamp: new Date()
        });
        socket.on('ping', () => {
            socket.emit('pong');
        });
        socket.on('join:room', (room) => {
            socket.join(room);
            console.log(`User ${userId} joined room: ${room}`);
        });
        socket.on('leave:room', (room) => {
            socket.leave(room);
            console.log(`User ${userId} left room: ${room}`);
        });
        socket.on('disconnect', () => {
            this.connectedUsers.delete(userId);
            console.log(`❌ User ${userId} (${role}) disconnected | Total connected: ${this.connectedUsers.size}`);
        });
        socket.on('error', (error) => {
            console.error(`Socket error for user ${userId}:`, error);
        });
    }
    async sendToUser(userId, event, data) {
        const user = this.connectedUsers.get(userId);
        if (user && this.io) {
            this.io.to(`user:${userId}`).emit(event, data);
            console.log(`📤 Sent ${event} to user ${userId}`);
            return true;
        }
        console.log(`⚠️ User ${userId} not connected, cannot send ${event}`);
        return false;
    }
    async sendToRole(role, event, data) {
        if (this.io) {
            this.io.to(`role:${role}`).emit(event, data);
            console.log(`📤 Broadcasted ${event} to all ${role}s`);
        }
    }
    async broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, data);
            console.log(`📢 Broadcasted ${event} to all users`);
        }
    }
    isUserConnected(userId) {
        return this.connectedUsers.has(userId);
    }
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }
    async close() {
        if (this.io) {
            await this.io.close();
            this.io = null;
            this.connectedUsers.clear();
            console.log('Socket.IO server closed');
        }
    }
    async sendOrderNotification(vendorId, orderData) {
        await this.sendToUser(vendorId, 'order:new', {
            ...orderData,
            type: 'ORDER',
            read: false
        });
    }
    async sendOrderStatusUpdate(customerId, orderId, status) {
        await this.sendToUser(customerId, 'order:status:updated', {
            orderId,
            status,
            timestamp: new Date(),
            type: 'ORDER_STATUS'
        });
    }
    async sendBookingNotification(vendorId, bookingData) {
        await this.sendToUser(vendorId, 'booking:new', {
            ...bookingData,
            type: 'BOOKING',
            read: false
        });
    }
    async sendBookingStatusUpdate(customerId, bookingId, status) {
        await this.sendToUser(customerId, 'booking:status:updated', {
            bookingId,
            status,
            timestamp: new Date(),
            type: 'BOOKING_STATUS'
        });
    }
    async sendPlantUpdate(userId, plantData) {
        await this.sendToUser(userId, 'plant:health:updated', {
            ...plantData,
            type: 'PLANT_UPDATE'
        });
    }
    async sendPlantReadyForHarvest(userId, plantId, plantName) {
        await this.sendToUser(userId, 'plant:ready:harvest', {
            plantId,
            plantName,
            message: `${plantName} is ready for harvest!`,
            timestamp: new Date(),
            type: 'PLANT_HARVEST'
        });
    }
    async sendCertificationNotification(vendorId, certData) {
        await this.sendToUser(vendorId, 'certification:status', {
            ...certData,
            type: 'CERTIFICATION',
            timestamp: new Date()
        });
    }
    async sendCommentNotification(postAuthorId, postId, commenterName) {
        await this.sendToUser(postAuthorId, 'comment:new', {
            postId,
            commenterName,
            message: `${commenterName} commented on your post`,
            timestamp: new Date(),
            type: 'COMMENT'
        });
    }
    async sendNotification(userId, title, message, type, metadata) {
        await this.sendToUser(userId, 'notification:new', {
            title,
            message,
            type,
            metadata,
            timestamp: new Date(),
            read: false
        });
    }
}
exports.default = new SocketService();
//# sourceMappingURL=socket.service.js.map