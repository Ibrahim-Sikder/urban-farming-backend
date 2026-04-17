"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceService = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
class MarketplaceService {
    static async createProduce(vendorUserId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId: vendorUserId },
            select: { id: true, certificationStatus: true, farmName: true }
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const produce = await prisma_1.default.produce.create({
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
        await redis_cache_service_1.default.delPattern('marketplace:produces:*');
        await redis_cache_service_1.default.delPattern(`marketplace:vendor:${vendorUserId}:*`);
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
    static async updateProduce(vendorUserId, produceId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId: vendorUserId },
            select: { id: true }
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const existing = await prisma_1.default.produce.findFirst({
            where: { id: produceId, vendorId: vendor.id }
        });
        if (!existing) {
            throw new Error('Produce not found');
        }
        const updated = await prisma_1.default.produce.update({
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
            redis_cache_service_1.default.delPattern('marketplace:produces:*'),
            redis_cache_service_1.default.delPattern(`marketplace:vendor:${vendorUserId}:*`),
            redis_cache_service_1.default.del(`marketplace:produce:${produceId}`)
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
    static async getAllProduce(filters = {}) {
        const cacheKey = `marketplace:produces:${JSON.stringify(filters)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const page = filters.page || 1;
        const limit = Math.min(100, filters.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = filters.sortBy || 'createdAt';
        const sortOrder = filters.sortOrder || 'desc';
        const where = {
            certificationStatus: 'APPROVED',
            availableQuantity: { gt: 0 }
        };
        if (filters.category) {
            where.category = filters.category;
        }
        if (filters.vendorId) {
            where.vendorId = filters.vendorId;
        }
        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            where.price = {};
            if (filters.minPrice !== undefined)
                where.price.gte = filters.minPrice;
            if (filters.maxPrice !== undefined)
                where.price.lte = filters.maxPrice;
        }
        if (filters.searchTerm) {
            where.OR = [
                { name: { contains: filters.searchTerm, mode: 'insensitive' } },
                { description: { contains: filters.searchTerm, mode: 'insensitive' } },
            ];
        }
        const [produces, total] = await Promise.all([
            prisma_1.default.produce.findMany({
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
            prisma_1.default.produce.count({ where })
        ]);
        const transformedProduces = produces.map(produce => ({
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
        const response = {
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
        await redis_cache_service_1.default.setFast(cacheKey, response, 300);
        return response;
    }
    static async getProduceById(produceId) {
        const cacheKey = `marketplace:produce:${produceId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const produce = await prisma_1.default.produce.findFirst({
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
        const response = {
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
        await redis_cache_service_1.default.setFast(cacheKey, response, 600);
        return response;
    }
    static async getVendorProduce(vendorUserId, filters = {}) {
        const cacheKey = `marketplace:vendor:${vendorUserId}:${JSON.stringify(filters)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const vendor = await prisma_1.default.vendorProfile.findUnique({
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
        const where = { vendorId: vendor.id };
        if (filters.category) {
            where.category = filters.category;
        }
        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            where.price = {};
            if (filters.minPrice !== undefined)
                where.price.gte = filters.minPrice;
            if (filters.maxPrice !== undefined)
                where.price.lte = filters.maxPrice;
        }
        if (filters.searchTerm) {
            where.OR = [
                { name: { contains: filters.searchTerm, mode: 'insensitive' } },
                { description: { contains: filters.searchTerm, mode: 'insensitive' } },
            ];
        }
        const [produces, total] = await Promise.all([
            prisma_1.default.produce.findMany({
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
            prisma_1.default.produce.count({ where })
        ]);
        const transformedProduces = produces.map(produce => ({
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
        const response = {
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
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async deleteProduce(vendorUserId, produceId) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId: vendorUserId },
            select: { id: true }
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const orders = await prisma_1.default.order.count({
            where: { produceId }
        });
        if (orders > 0) {
            throw new Error('Cannot delete produce with existing orders');
        }
        await prisma_1.default.produce.deleteMany({
            where: { id: produceId, vendorId: vendor.id }
        });
        await Promise.all([
            redis_cache_service_1.default.delPattern('marketplace:produces:*'),
            redis_cache_service_1.default.delPattern(`marketplace:vendor:${vendorUserId}:*`),
            redis_cache_service_1.default.del(`marketplace:produce:${produceId}`)
        ]);
        return { message: 'Produce deleted successfully' };
    }
    static async getCart(userId) {
        const cacheKey = `marketplace:cart:${userId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const cartItems = await prisma_1.default.cartItem.findMany({
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
        const response = {
            items,
            totalItems: items.length,
            totalPrice,
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async addToCart(userId, data) {
        const produce = await prisma_1.default.produce.findFirst({
            where: {
                id: data.produceId,
                certificationStatus: 'APPROVED',
                availableQuantity: { gte: data.quantity }
            }
        });
        if (!produce) {
            throw new Error('Produce not available or insufficient quantity');
        }
        const existingItem = await prisma_1.default.cartItem.findFirst({
            where: { userId, produceId: data.produceId }
        });
        if (existingItem) {
            await prisma_1.default.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + data.quantity }
            });
        }
        else {
            await prisma_1.default.cartItem.create({
                data: {
                    userId,
                    produceId: data.produceId,
                    quantity: data.quantity
                }
            });
        }
        await redis_cache_service_1.default.del(`marketplace:cart:${userId}`);
        return this.getCart(userId);
    }
    static async updateCartItem(userId, itemId, quantity) {
        const cartItem = await prisma_1.default.cartItem.findFirst({
            where: { id: itemId, userId },
            include: { produce: true }
        });
        if (!cartItem) {
            throw new Error('Cart item not found');
        }
        if (quantity <= 0) {
            await prisma_1.default.cartItem.delete({ where: { id: itemId } });
        }
        else {
            if (cartItem.produce.availableQuantity < quantity) {
                throw new Error('Insufficient quantity available');
            }
            await prisma_1.default.cartItem.update({
                where: { id: itemId },
                data: { quantity }
            });
        }
        await redis_cache_service_1.default.del(`marketplace:cart:${userId}`);
        return this.getCart(userId);
    }
    static async removeFromCart(userId, itemId) {
        await prisma_1.default.cartItem.deleteMany({
            where: { id: itemId, userId }
        });
        await redis_cache_service_1.default.del(`marketplace:cart:${userId}`);
        return this.getCart(userId);
    }
    static async clearCart(userId) {
        await prisma_1.default.cartItem.deleteMany({
            where: { userId }
        });
        await redis_cache_service_1.default.del(`marketplace:cart:${userId}`);
        return { items: [], totalItems: 0, totalPrice: 0 };
    }
    static async createOrder(userId, data) {
        const produce = await prisma_1.default.produce.findFirst({
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
        const order = await prisma_1.default.order.create({
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
                                user: {
                                    select: { name: true }
                                }
                            }
                        }
                    }
                }
            }
        });
        await prisma_1.default.produce.update({
            where: { id: data.produceId },
            data: { availableQuantity: { decrement: data.quantity } }
        });
        await prisma_1.default.cartItem.deleteMany({
            where: { userId, produceId: data.produceId }
        });
        await prisma_1.default.notification.create({
            data: {
                userId: produce.vendorId,
                title: 'New Order Received',
                message: `You have received a new order for ${data.quantity} x ${produce.name}`,
                type: 'ORDER',
            },
        });
        await Promise.all([
            redis_cache_service_1.default.del(`marketplace:cart:${userId}`),
            redis_cache_service_1.default.delPattern(`marketplace:orders:${userId}:*`),
            redis_cache_service_1.default.delPattern('marketplace:produces:*')
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
                vendor: {
                    farmName: order.produce.vendor.farmName,
                },
            },
        };
    }
    static async getUserOrders(userId, filters = {}) {
        const cacheKey = `marketplace:orders:${userId}:${JSON.stringify(filters)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const page = filters.page || 1;
        const limit = Math.min(50, filters.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = filters.sortBy || 'orderDate';
        const sortOrder = filters.sortOrder || 'desc';
        const where = { userId };
        if (filters.status) {
            where.status = filters.status;
        }
        const [orders, total] = await Promise.all([
            prisma_1.default.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    produce: {
                        include: {
                            vendor: {
                                select: { farmName: true }
                            }
                        }
                    }
                }
            }),
            prisma_1.default.order.count({ where })
        ]);
        const transformedOrders = orders.map(order => ({
            id: order.id,
            quantity: order.quantity,
            totalPrice: order.totalPrice,
            status: order.status,
            orderDate: order.orderDate,
            produce: {
                id: order.produce.id,
                name: order.produce.name,
                vendor: {
                    farmName: order.produce.vendor.farmName,
                },
            },
        }));
        const totalPages = Math.ceil(total / limit);
        const response = {
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
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async getOrderById(userId, orderId) {
        const cacheKey = `marketplace:order:${orderId}:user:${userId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const order = await prisma_1.default.order.findFirst({
            where: { id: orderId, userId },
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
        if (!order) {
            throw new Error('Order not found');
        }
        const response = {
            id: order.id,
            quantity: order.quantity,
            totalPrice: order.totalPrice,
            status: order.status,
            orderDate: order.orderDate,
            produce: {
                id: order.produce.id,
                name: order.produce.name,
                vendor: {
                    farmName: order.produce.vendor.farmName,
                },
            },
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 300);
        return response;
    }
    static async updateOrderStatus(vendorUserId, orderId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId: vendorUserId },
            select: { id: true }
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const order = await prisma_1.default.order.findFirst({
            where: { id: orderId, vendorId: vendor.id },
            include: {
                produce: true,
                user: true
            }
        });
        if (!order) {
            throw new Error('Order not found');
        }
        const updatedOrder = await prisma_1.default.order.update({
            where: { id: orderId },
            data: { status: data.status },
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
        await prisma_1.default.notification.create({
            data: {
                userId: order.userId,
                title: 'Order Status Updated',
                message: `Your order #${orderId} status has been updated to ${data.status}`,
                type: 'ORDER',
            },
        });
        await Promise.all([
            redis_cache_service_1.default.delPattern(`marketplace:orders:${order.userId}:*`),
            redis_cache_service_1.default.del(`marketplace:order:${orderId}:user:${order.userId}`),
            redis_cache_service_1.default.delPattern(`marketplace:vendor:${vendorUserId}:*`)
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
                vendor: {
                    farmName: updatedOrder.produce.vendor.farmName,
                },
            },
        };
    }
}
exports.MarketplaceService = MarketplaceService;
//# sourceMappingURL=marketplace.service.js.map