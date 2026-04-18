import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface ConnectedUser {
    userId: number;
    role: string;
    socketId: string;
}

interface OrderNotificationData {
    orderId: number;
    customerName: string;
    productName: string;
    quantity: number;
    totalPrice: number;
    timestamp: Date;
}

interface BookingNotificationData {
    bookingId: number;
    spaceId: number;
    customerName: string;
    startDate: Date;
    endDate: Date;
    timestamp: Date;
}

interface PlantUpdateData {
    plantId: number;
    plantName: string;
    status: string;
    healthStatus: string;
    growthStage: string;
    timestamp: Date;
}

interface CertificationNotificationData {
    vendorId: number;
    status: string;
    message: string;
    timestamp: Date;
}

class SocketService {
    private io: SocketServer | null = null;
    private connectedUsers: Map<number, ConnectedUser> = new Map();

    initialize(httpServer: HttpServer) {
        this.io = new SocketServer(httpServer, {
            cors: {
                origin: config.cors.origin,
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
                const decoded = jwt.verify(token, config.jwt.secret) as any;
                socket.data.userId = decoded.id;
                socket.data.role = decoded.role;
                next();
            } catch (err) {
                next(new Error('Authentication error: Invalid token'));
            }
        });

        this.io.on('connection', (socket: Socket) => {
            this.handleConnection(socket);
        });

    }

    private handleConnection(socket: Socket) {
        const userId = socket.data.userId;
        const role = socket.data.role;

        // Store connected user
        this.connectedUsers.set(userId, {
            userId,
            role,
            socketId: socket.id
        });

        console.log(`✅ User ${userId} (${role}) connected | Total connected: ${this.connectedUsers.size}`);

        // Join user to their role-based room
        socket.join(`role:${role}`);
        socket.join(`user:${userId}`);

        // Send connection confirmation
        socket.emit('connection:confirmed', {
            userId,
            role,
            message: 'Connected to WebSocket server',
            timestamp: new Date()
        });

        // Handle ping/pong for connection health
        socket.on('ping', () => {
            socket.emit('pong');
        });

        // Handle join room requests
        socket.on('join:room', (room: string) => {
            socket.join(room);
            console.log(`User ${userId} joined room: ${room}`);
        });

        // Handle leave room requests
        socket.on('leave:room', (room: string) => {
            socket.leave(room);
            console.log(`User ${userId} left room: ${room}`);
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            this.connectedUsers.delete(userId);
            console.log(`❌ User ${userId} (${role}) disconnected | Total connected: ${this.connectedUsers.size}`);
        });

        socket.on('error', (error) => {
            console.error(`Socket error for user ${userId}:`, error);
        });
    }


    // Send notification to specific user
    async sendToUser(userId: number, event: string, data: any): Promise<boolean> {
        const user = this.connectedUsers.get(userId);
        if (user && this.io) {
            this.io.to(`user:${userId}`).emit(event, data);
            console.log(`📤 Sent ${event} to user ${userId}`);
            return true;
        }
        console.log(`⚠️ User ${userId} not connected, cannot send ${event}`);
        return false;
    }

    // Send notification to all users with specific role
    async sendToRole(role: string, event: string, data: any): Promise<void> {
        if (this.io) {
            this.io.to(`role:${role}`).emit(event, data);
            console.log(`📤 Broadcasted ${event} to all ${role}s`);
        }
    }

    // Broadcast to everyone
    async broadcast(event: string, data: any): Promise<void> {
        if (this.io) {
            this.io.emit(event, data);
            console.log(`📢 Broadcasted ${event} to all users`);
        }
    }

    isUserConnected(userId: number): boolean {
        return this.connectedUsers.has(userId);
    }

    getConnectedUsersCount(): number {
        return this.connectedUsers.size;
    }
    async close(): Promise<void> {
        if (this.io) {
            await this.io.close();
            this.io = null;
            this.connectedUsers.clear();
            console.log('Socket.IO server closed');
        }
    }


    async sendOrderNotification(vendorId: number, orderData: OrderNotificationData): Promise<void> {
        await this.sendToUser(vendorId, 'order:new', {
            ...orderData,
            type: 'ORDER',
            read: false
        });
    }

    async sendOrderStatusUpdate(customerId: number, orderId: number, status: string): Promise<void> {
        await this.sendToUser(customerId, 'order:status:updated', {
            orderId,
            status,
            timestamp: new Date(),
            type: 'ORDER_STATUS'
        });
    }

    async sendBookingNotification(vendorId: number, bookingData: BookingNotificationData): Promise<void> {
        await this.sendToUser(vendorId, 'booking:new', {
            ...bookingData,
            type: 'BOOKING',
            read: false
        });
    }

    async sendBookingStatusUpdate(customerId: number, bookingId: number, status: string): Promise<void> {
        await this.sendToUser(customerId, 'booking:status:updated', {
            bookingId,
            status,
            timestamp: new Date(),
            type: 'BOOKING_STATUS'
        });
    }

    async sendPlantUpdate(userId: number, plantData: PlantUpdateData): Promise<void> {
        await this.sendToUser(userId, 'plant:health:updated', {
            ...plantData,
            type: 'PLANT_UPDATE'
        });
    }

    async sendPlantReadyForHarvest(userId: number, plantId: number, plantName: string): Promise<void> {
        await this.sendToUser(userId, 'plant:ready:harvest', {
            plantId,
            plantName,
            message: `${plantName} is ready for harvest!`,
            timestamp: new Date(),
            type: 'PLANT_HARVEST'
        });
    }

    async sendCertificationNotification(vendorId: number, certData: CertificationNotificationData): Promise<void> {
        await this.sendToUser(vendorId, 'certification:status', {
            ...certData,
            type: 'CERTIFICATION',
            timestamp: new Date()
        });
    }
    async sendCommentNotification(postAuthorId: number, postId: number, commenterName: string): Promise<void> {
        await this.sendToUser(postAuthorId, 'comment:new', {
            postId,
            commenterName,
            message: `${commenterName} commented on your post`,
            timestamp: new Date(),
            type: 'COMMENT'
        });
    }

    async sendNotification(userId: number, title: string, message: string, type: string, metadata?: any): Promise<void> {
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

export default new SocketService();