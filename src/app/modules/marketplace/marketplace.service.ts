import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import socketService from '../../services/socket.service';
import {
    AddToCartInput,
    CartResponse,
    CreateOrderInput,
    CreateProduceInput,
    OrderResponse,
    PaginatedResponse,
    ProduceFilters,
    ProduceResponse,
    UpdateOrderStatusInput,
    UpdateProduceInput
} from './marketplace.type';

export class MarketplaceService {


    static async createProduce(vendorUserId: number, data: CreateProduceInput): Promise<ProduceResponse> {
        const vendor = await prisma.vendorProfile.findUnique({
            where: { userId: vendorUserId },
            select: { id: true, certificationStatus: true, farmName: true }
        });

        if (!vendor) {
            throw new Error('Vendor profile not found');
        }

        const produce = await prisma.produce.create({
            data: {
                vendorId: vendor.id,
                name: data.name,
                description: data.description,
                price: data.price,
                category: data.category,
                availableQuantity: data.availableQuantity,
                certificationStatus: vendor.certificationStatus,
            },
            include: {
                vendor: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    }
                }
            }
        });

        await RedisCacheService.delPattern('marketplace:produces:*');
        await RedisCacheService.delPattern(`marketplace:vendor:${vendorUserId}:*`);

        return {
            id: produce.id,
            name: produce.name,
            description: produce.description,
            price: produce.price,
            category: produce.category,
            certificationStatus: produce.certificationStatus,
            availableQuantity: produce.availableQuantity,
            vendor: {
                id: produce.vendor.id,
                farmName: produce.vendor.farmName,
                user: {
                    name: produce.vendor.user.name,
                    email: produce.vendor.user.email,
                },
            },
            createdAt: produce.createdAt,
            updatedAt: produce.updatedAt,
        };
    }

    static async updateProduce(vendorUserId: number, produceId: number, data: UpdateProduceInput): Promise<ProduceResponse> {
        const vendor = await prisma.vendorProfile.findUnique({
            where: { userId: vendorUserId },
            select: { id: true }
        });

        if (!vendor) {
            throw new Error('Vendor profile not found');
        }

        const existing = await prisma.produce.findFirst({
            where: { id: produceId, vendorId: vendor.id }
        });

        if (!existing) {
            throw new Error('Produce not found');
        }

        const updated = await prisma.produce.update({
            where: { id: produceId },
            data: {
                name: data.name,
                description: data.description,
                price: data.price,
                category: data.category,
                availableQuantity: data.availableQuantity,
            },
            include: {
                vendor: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    }
                }
            }
        });

        await Promise.all([
            RedisCacheService.delPattern('marketplace:produces:*'),
            RedisCacheService.delPattern(`marketplace:vendor:${vendorUserId}:*`),
            RedisCacheService.del(`marketplace:produce:${produceId}`)
        ]);

        return {
            id: updated.id,
            name: updated.name,
            description: updated.description,
            price: updated.price,
            category: updated.category,
            certificationStatus: updated.certificationStatus,
            availableQuantity: updated.availableQuantity,
            vendor: {
                id: updated.vendor.id,
                farmName: updated.vendor.farmName,
                user: {
                    name: updated.vendor.user.name,
                    email: updated.vendor.user.email,
                },
            },
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }

    static async getAllProduce(filters: ProduceFilters = {}): Promise<PaginatedResponse<ProduceResponse>> {
        const cacheKey = `marketplace:produces:${JSON.stringify(filters)}`;

        const cached = await RedisCacheService.getFast<PaginatedResponse<ProduceResponse>>(cacheKey);
        if (cached) {
            return cached;
        }

        const page = filters.page || 1;
        const limit = Math.min(100, filters.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = filters.sortBy || 'createdAt';
        const sortOrder = filters.sortOrder || 'desc';

        const where: any = {
            certificationStatus: 'APPROVED',
            availableQuantity: { gt: 0 }
        };

        if (filters.category) where.category = filters.category;
        if (filters.vendorId) where.vendorId = filters.vendorId;
        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            where.price = {};
            if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
            if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
        }
        if (filters.searchTerm) {
            where.OR = [
                { name: { contains: filters.searchTerm, mode: 'insensitive' } },
                { description: { contains: filters.searchTerm, mode: 'insensitive' } },
            ];
        }

        const [produces, total] = await Promise.all([
            prisma.produce.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    vendor: {
                        include: {
                            user: {
                                select: { name: true, email: true }
                            }
                        }
                    }
                }
            }),
            prisma.produce.count({ where })
        ]);

        const transformedProduces: ProduceResponse[] = produces.map(produce => ({
            id: produce.id,
            name: produce.name,
            description: produce.description,
            price: produce.price,
            category: produce.category,
            certificationStatus: produce.certificationStatus,
            availableQuantity: produce.availableQuantity,
            vendor: {
                id: produce.vendor.id,
                farmName: produce.vendor.farmName,
                user: {
                    name: produce.vendor.user.name,
                    email: produce.vendor.user.email,
                },
            },
            createdAt: produce.createdAt,
            updatedAt: produce.updatedAt,
        }));

        const totalPages = Math.ceil(total / limit);
        const response: PaginatedResponse<ProduceResponse> = {
            data: transformedProduces,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        };

        await RedisCacheService.setFast(cacheKey, response, 300);
        return response;
    }

    static async getProduceById(produceId: number): Promise<ProduceResponse> {
        const cacheKey = `marketplace:produce:${produceId}`;

        const cached = await RedisCacheService.getFast<ProduceResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const produce = await prisma.produce.findFirst({
            where: {
                id: produceId,
                certificationStatus: 'APPROVED',
                availableQuantity: { gt: 0 }
            },
            include: {
                vendor: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    }
                }
            }
        });

        if (!produce) {
            throw new Error('Produce not found');
        }

        const response: ProduceResponse = {
            id: produce.id,
            name: produce.name,
            description: produce.description,
            price: produce.price,
            category: produce.category,
            certificationStatus: produce.certificationStatus,
            availableQuantity: produce.availableQuantity,
            vendor: {
                id: produce.vendor.id,
                farmName: produce.vendor.farmName,
                user: {
                    name: produce.vendor.user.name,
                    email: produce.vendor.user.email,
                },
            },
            createdAt: produce.createdAt,
            updatedAt: produce.updatedAt,
        };

        await RedisCacheService.setFast(cacheKey, response, 600);
        return response;
    }

    static async getVendorProduce(vendorUserId: number, filters: ProduceFilters = {}): Promise<PaginatedResponse<ProduceResponse>> {
        const cacheKey = `marketplace:vendor:${vendorUserId}:${JSON.stringify(filters)}`;

        const cached = await RedisCacheService.getFast<PaginatedResponse<ProduceResponse>>(cacheKey);
        if (cached) {
            return cached;
        }

        const vendor = await prisma.vendorProfile.findUnique({
            where: { userId: vendorUserId },
            select: { id: true }
        });

        if (!vendor) {
            throw new Error('Vendor profile not found');
        }

        const page = filters.page || 1;
        const limit = Math.min(100, filters.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = filters.sortBy || 'createdAt';
        const sortOrder = filters.sortOrder || 'desc';

        const where: any = { vendorId: vendor.id };

        if (filters.category) where.category = filters.category;
        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            where.price = {};
            if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
            if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
        }
        if (filters.searchTerm) {
            where.OR = [
                { name: { contains: filters.searchTerm, mode: 'insensitive' } },
                { description: { contains: filters.searchTerm, mode: 'insensitive' } },
            ];
        }

        const [produces, total] = await Promise.all([
            prisma.produce.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    vendor: {
                        include: {
                            user: {
                                select: { name: true, email: true }
                            }
                        }
                    }
                }
            }),
            prisma.produce.count({ where })
        ]);

        const transformedProduces: ProduceResponse[] = produces.map(produce => ({
            id: produce.id,
            name: produce.name,
            description: produce.description,
            price: produce.price,
            category: produce.category,
            certificationStatus: produce.certificationStatus,
            availableQuantity: produce.availableQuantity,
            vendor: {
                id: produce.vendor.id,
                farmName: produce.vendor.farmName,
                user: {
                    name: produce.vendor.user.name,
                    email: produce.vendor.user.email,
                },
            },
            createdAt: produce.createdAt,
            updatedAt: produce.updatedAt,
        }));

        const totalPages = Math.ceil(total / limit);
        const response: PaginatedResponse<ProduceResponse> = {
            data: transformedProduces,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        };

        await RedisCacheService.setFast(cacheKey, response, 120);
        return response;
    }

    static async deleteProduce(vendorUserId: number, produceId: number): Promise<{ message: string }> {
        const vendor = await prisma.vendorProfile.findUnique({
            where: { userId: vendorUserId },
            select: { id: true }
        });

        if (!vendor) {
            throw new Error('Vendor profile not found');
        }

        const orders = await prisma.order.count({ where: { produceId } });
        if (orders > 0) {
            throw new Error('Cannot delete produce with existing orders');
        }

        await prisma.produce.deleteMany({
            where: { id: produceId, vendorId: vendor.id }
        });

        await Promise.all([
            RedisCacheService.delPattern('marketplace:produces:*'),
            RedisCacheService.delPattern(`marketplace:vendor:${vendorUserId}:*`),
            RedisCacheService.del(`marketplace:produce:${produceId}`)
        ]);

        return { message: 'Produce deleted successfully' };
    }

    static async getCart(userId: number): Promise<CartResponse> {
        const cacheKey = `marketplace:cart:${userId}`;

        const cached = await RedisCacheService.getFast<CartResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const cartItems = await prisma.cartItem.findMany({
            where: { userId },
            include: {
                produce: {
                    include: {
                        vendor: {
                            select: { farmName: true }
                        }
                    }
                }
            }
        });

        const items = cartItems.map(item => ({
            id: item.id,
            quantity: item.quantity,
            produce: {
                id: item.produce.id,
                name: item.produce.name,
                price: item.produce.price,
                availableQuantity: item.produce.availableQuantity,
                vendor: {
                    farmName: item.produce.vendor.farmName,
                },
            },
            subtotal: item.produce.price * item.quantity,
        }));

        const totalPrice = items.reduce((sum, item) => sum + item.subtotal, 0);
        const response: CartResponse = { items, totalItems: items.length, totalPrice };

        await RedisCacheService.setFast(cacheKey, response, 120);
        return response;
    }

    static async addToCart(userId: number, data: AddToCartInput): Promise<CartResponse> {
        const produce = await prisma.produce.findFirst({
            where: {
                id: data.produceId,
                certificationStatus: 'APPROVED',
                availableQuantity: { gte: data.quantity }
            }
        });

        if (!produce) {
            throw new Error('Produce not available or insufficient quantity');
        }

        const existingItem = await prisma.cartItem.findFirst({
            where: { userId, produceId: data.produceId }
        });

        if (existingItem) {
            await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + data.quantity }
            });
        } else {
            await prisma.cartItem.create({
                data: { userId, produceId: data.produceId, quantity: data.quantity }
            });
        }

        await RedisCacheService.del(`marketplace:cart:${userId}`);
        return this.getCart(userId);
    }

    static async updateCartItem(userId: number, itemId: number, quantity: number): Promise<CartResponse> {
        const cartItem = await prisma.cartItem.findFirst({
            where: { id: itemId, userId },
            include: { produce: true }
        });

        if (!cartItem) {
            throw new Error('Cart item not found');
        }

        if (quantity <= 0) {
            await prisma.cartItem.delete({ where: { id: itemId } });
        } else {
            if (cartItem.produce.availableQuantity < quantity) {
                throw new Error('Insufficient quantity available');
            }
            await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
        }

        await RedisCacheService.del(`marketplace:cart:${userId}`);
        return this.getCart(userId);
    }

    static async removeFromCart(userId: number, itemId: number): Promise<CartResponse> {
        await prisma.cartItem.deleteMany({ where: { id: itemId, userId } });
        await RedisCacheService.del(`marketplace:cart:${userId}`);
        return this.getCart(userId);
    }

    static async clearCart(userId: number): Promise<CartResponse> {
        await prisma.cartItem.deleteMany({ where: { userId } });
        await RedisCacheService.del(`marketplace:cart:${userId}`);
        return { items: [], totalItems: 0, totalPrice: 0 };
    }

    static async createOrder(userId: number, data: CreateOrderInput): Promise<OrderResponse> {
        const produce = await prisma.produce.findFirst({
            where: {
                id: data.produceId,
                certificationStatus: 'APPROVED',
                availableQuantity: { gte: data.quantity }
            }
        });

        if (!produce) {
            throw new Error('Produce not available or insufficient quantity');
        }

        const totalPrice = produce.price * data.quantity;

        const order = await prisma.order.create({
            data: {
                userId,
                produceId: data.produceId,
                vendorId: produce.vendorId,
                quantity: data.quantity,
                totalPrice,
                status: 'PENDING',
            },
            include: {
                produce: {
                    include: {
                        vendor: {
                            include: {
                                user: { select: { name: true } }
                            }
                        }
                    }
                }
            }
        });

        await prisma.produce.update({
            where: { id: data.produceId },
            data: { availableQuantity: { decrement: data.quantity } }
        });

        await prisma.cartItem.deleteMany({
            where: { userId, produceId: data.produceId }
        });

        const customer = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true }
        });

        await socketService.sendOrderNotification(produce.vendorId, {
            orderId: order.id,
            customerName: customer?.name || 'Customer',
            productName: produce.name,
            quantity: data.quantity,
            totalPrice: totalPrice,
            timestamp: new Date()
        });

        await prisma.notification.create({
            data: {
                userId: produce.vendorId,
                title: 'New Order Received',
                message: `You have received a new order for ${data.quantity} x ${produce.name}`,
                type: 'ORDER',
            },
        });

        await Promise.all([
            RedisCacheService.del(`marketplace:cart:${userId}`),
            RedisCacheService.delPattern(`marketplace:orders:${userId}:*`),
            RedisCacheService.delPattern('marketplace:produces:*')
        ]);

        return {
            id: order.id,
            quantity: order.quantity,
            totalPrice: order.totalPrice,
            status: order.status,
            orderDate: order.orderDate,
            produce: {
                id: order.produce.id,
                name: order.produce.name,
                vendor: { farmName: order.produce.vendor.farmName },
            },
        };
    }

    static async getUserOrders(userId: number, filters: ProduceFilters = {}): Promise<PaginatedResponse<OrderResponse>> {
        const cacheKey = `marketplace:orders:${userId}:${JSON.stringify(filters)}`;

        const cached = await RedisCacheService.getFast<PaginatedResponse<OrderResponse>>(cacheKey);
        if (cached) {
            return cached;
        }

        const page = filters.page || 1;
        const limit = Math.min(50, filters.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = filters.sortBy || 'orderDate';
        const sortOrder = filters.sortOrder || 'desc';

        const where: any = { userId };
        if (filters.status) where.status = filters.status;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    produce: {
                        include: {
                            vendor: { select: { farmName: true } }
                        }
                    }
                }
            }),
            prisma.order.count({ where })
        ]);

        const transformedOrders: OrderResponse[] = orders.map(order => ({
            id: order.id,
            quantity: order.quantity,
            totalPrice: order.totalPrice,
            status: order.status,
            orderDate: order.orderDate,
            produce: {
                id: order.produce.id,
                name: order.produce.name,
                vendor: { farmName: order.produce.vendor.farmName },
            },
        }));

        const totalPages = Math.ceil(total / limit);
        const response: PaginatedResponse<OrderResponse> = {
            data: transformedOrders,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        };

        await RedisCacheService.setFast(cacheKey, response, 120);
        return response;
    }

    static async getOrderById(userId: number, orderId: number): Promise<OrderResponse> {
        const cacheKey = `marketplace:order:${orderId}:user:${userId}`;

        const cached = await RedisCacheService.getFast<OrderResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const order = await prisma.order.findFirst({
            where: { id: orderId, userId },
            include: {
                produce: {
                    include: {
                        vendor: { select: { farmName: true } }
                    }
                }
            }
        });

        if (!order) {
            throw new Error('Order not found');
        }

        const response: OrderResponse = {
            id: order.id,
            quantity: order.quantity,
            totalPrice: order.totalPrice,
            status: order.status,
            orderDate: order.orderDate,
            produce: {
                id: order.produce.id,
                name: order.produce.name,
                vendor: { farmName: order.produce.vendor.farmName },
            },
        };

        await RedisCacheService.setFast(cacheKey, response, 300);
        return response;
    }

    static async updateOrderStatus(vendorUserId: number, orderId: number, data: UpdateOrderStatusInput): Promise<OrderResponse> {
        const vendor = await prisma.vendorProfile.findUnique({
            where: { userId: vendorUserId },
            select: { id: true }
        });

        if (!vendor) {
            throw new Error('Vendor profile not found');
        }

        const order = await prisma.order.findFirst({
            where: { id: orderId, vendorId: vendor.id },
            include: { produce: true, user: true }
        });

        if (!order) {
            throw new Error('Order not found');
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { status: data.status },
            include: {
                produce: {
                    include: {
                        vendor: { select: { farmName: true } }
                    }
                }
            }
        });

        await socketService.sendOrderStatusUpdate(order.userId, orderId, data.status);

        await prisma.notification.create({
            data: {
                userId: order.userId,
                title: 'Order Status Updated',
                message: `Your order #${orderId} status has been updated to ${data.status}`,
                type: 'ORDER',
            },
        });

        await Promise.all([
            RedisCacheService.delPattern(`marketplace:orders:${order.userId}:*`),
            RedisCacheService.del(`marketplace:order:${orderId}:user:${order.userId}`),
            RedisCacheService.delPattern(`marketplace:vendor:${vendorUserId}:*`)
        ]);

        return {
            id: updatedOrder.id,
            quantity: updatedOrder.quantity,
            totalPrice: updatedOrder.totalPrice,
            status: updatedOrder.status,
            orderDate: updatedOrder.orderDate,
            produce: {
                id: updatedOrder.produce.id,
                name: updatedOrder.produce.name,
                vendor: { farmName: updatedOrder.produce.vendor.farmName },
            },
        };
    }
}