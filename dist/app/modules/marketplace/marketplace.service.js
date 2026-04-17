"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceService = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
class MarketplaceService {
    static async createProduce(vendorId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId: vendorId },
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
                            select: { name: true }
                        }
                    }
                }
            }
        });
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
                },
            },
            createdAt: produce.createdAt,
            updatedAt: produce.updatedAt,
        };
    }
    static async updateProduce(vendorId, produceId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId: vendorId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const produce = await prisma_1.default.produce.findFirst({
            where: { id: produceId, vendorId: vendor.id },
        });
        if (!produce) {
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
                            select: { name: true }
                        }
                    }
                }
            }
        });
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
                },
            },
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }
    static async getAllProduce(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const where = {
            certificationStatus: 'APPROVED',
            availableQuantity: { gt: 0 }
        };
        if (filters.category)
            where.category = filters.category;
        if (filters.vendorId)
            where.vendorId = filters.vendorId;
        if (filters.minPrice || filters.maxPrice) {
            where.price = {};
            if (filters.minPrice)
                where.price.gte = filters.minPrice;
            if (filters.maxPrice)
                where.price.lte = filters.maxPrice;
        }
        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const [produces, total] = await Promise.all([
            prisma_1.default.produce.findMany({
                where,
                skip,
                take: limit,
                include: {
                    vendor: {
                        include: {
                            user: {
                                select: { name: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.default.produce.count({ where }),
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
                },
            },
            createdAt: produce.createdAt,
            updatedAt: produce.updatedAt,
        }));
        return {
            produces: transformedProduces,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async getProduceById(produceId) {
        const produce = await prisma_1.default.produce.findFirst({
            where: {
                id: produceId,
                certificationStatus: 'APPROVED',
            },
            include: {
                vendor: {
                    include: {
                        user: {
                            select: { name: true }
                        }
                    }
                }
            }
        });
        if (!produce) {
            throw new Error('Produce not found');
        }
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
                },
            },
            createdAt: produce.createdAt,
            updatedAt: produce.updatedAt,
        };
    }
    static async getVendorProduce(vendorId, page = 1, limit = 10) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId: vendorId }
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const skip = (page - 1) * limit;
        const [produces, total] = await Promise.all([
            prisma_1.default.produce.findMany({
                where: { vendorId: vendor.id },
                skip,
                take: limit,
                include: {
                    vendor: {
                        include: {
                            user: {
                                select: { name: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.default.produce.count({ where: { vendorId: vendor.id } }),
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
                },
            },
            createdAt: produce.createdAt,
            updatedAt: produce.updatedAt,
        }));
        return {
            produces: transformedProduces,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async deleteProduce(vendorId, produceId) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId: vendorId },
        });
        if (!vendor) {
            throw new Error('Vendor profile not found');
        }
        const produce = await prisma_1.default.produce.findFirst({
            where: { id: produceId, vendorId: vendor.id },
            include: { orders: true },
        });
        if (!produce) {
            throw new Error('Produce not found');
        }
        if (produce.orders.length > 0) {
            throw new Error('Cannot delete produce with existing orders');
        }
        await prisma_1.default.produce.delete({ where: { id: produceId } });
        return { message: 'Produce deleted successfully' };
    }
    static async getCart(userId) {
        const cartItems = await prisma_1.default.$queryRaw `
            SELECT ci.id, ci.quantity, ci.produceId, 
                   p.id as produce_id, p.name, p.price, p.availableQuantity,
                   vp.farmName
            FROM "CartItem" ci
            JOIN "Produce" p ON ci."produceId" = p.id
            JOIN "VendorProfile" vp ON p."vendorId" = vp.id
            WHERE ci."userId" = ${userId}
        `;
        const items = cartItems;
        const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return {
            items: items.map(item => ({
                id: item.id,
                quantity: item.quantity,
                produce: {
                    id: item.produce_id,
                    name: item.name,
                    price: item.price,
                    availableQuantity: item.availableQuantity,
                    vendor: {
                        farmName: item.farmname,
                    },
                },
                subtotal: item.price * item.quantity,
            })),
            totalItems: items.length,
            totalPrice,
        };
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
        const existingItem = await prisma_1.default.$queryRaw `
            SELECT id, quantity FROM "CartItem" 
            WHERE "userId" = ${userId} AND "produceId" = ${data.produceId}
        `;
        const existingItems = existingItem;
        if (existingItems.length > 0) {
            await prisma_1.default.$executeRaw `
                UPDATE "CartItem" 
                SET quantity = ${existingItems[0].quantity + data.quantity}
                WHERE id = ${existingItems[0].id}
            `;
        }
        else {
            await prisma_1.default.$executeRaw `
                INSERT INTO "CartItem" ("userId", "produceId", quantity)
                VALUES (${userId}, ${data.produceId}, ${data.quantity})
            `;
        }
        return this.getCart(userId);
    }
    static async updateCartItem(userId, itemId, quantity) {
        const cartItem = await prisma_1.default.$queryRaw `
            SELECT ci.id, ci.quantity, ci.produceId, p.availableQuantity
            FROM "CartItem" ci
            JOIN "Produce" p ON ci."produceId" = p.id
            WHERE ci.id = ${itemId} AND ci."userId" = ${userId}
        `;
        const items = cartItem;
        if (items.length === 0) {
            throw new Error('Cart item not found');
        }
        if (quantity <= 0) {
            await prisma_1.default.$executeRaw `DELETE FROM "CartItem" WHERE id = ${itemId}`;
        }
        else {
            if (items[0].availablequantity < quantity) {
                throw new Error('Insufficient quantity available');
            }
            await prisma_1.default.$executeRaw `
                UPDATE "CartItem" SET quantity = ${quantity} WHERE id = ${itemId}
            `;
        }
        return this.getCart(userId);
    }
    static async removeFromCart(userId, itemId) {
        await prisma_1.default.$executeRaw `
            DELETE FROM "CartItem" 
            WHERE id = ${itemId} AND "userId" = ${userId}
        `;
        return this.getCart(userId);
    }
    static async clearCart(userId) {
        await prisma_1.default.$executeRaw `DELETE FROM "CartItem" WHERE "userId" = ${userId}`;
        return this.getCart(userId);
    }
    static async createOrder(userId, data) {
        const produce = await prisma_1.default.produce.findFirst({
            where: {
                id: data.produceId,
                certificationStatus: 'APPROVED',
                availableQuantity: { gte: data.quantity }
            },
            include: {
                vendor: true
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
                vendorId: data.vendorId,
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
        await prisma_1.default.$executeRaw `
            DELETE FROM "CartItem" 
            WHERE "userId" = ${userId} AND "produceId" = ${data.produceId}
        `;
        await prisma_1.default.notification.create({
            data: {
                userId: data.vendorId,
                title: 'New Order Received',
                message: `You have received a new order for ${data.quantity} x ${produce.name}`,
                type: 'ORDER',
            },
        });
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
    static async getUserOrders(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            prisma_1.default.order.findMany({
                where: { userId },
                skip,
                take: limit,
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
                },
                orderBy: { orderDate: 'desc' },
            }),
            prisma_1.default.order.count({ where: { userId } }),
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
        return {
            orders: transformedOrders,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async getOrderById(userId, orderId) {
        const order = await prisma_1.default.order.findFirst({
            where: { id: orderId, userId },
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
        if (!order) {
            throw new Error('Order not found');
        }
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
    static async updateOrderStatus(vendorId, orderId, data) {
        const vendor = await prisma_1.default.vendorProfile.findUnique({
            where: { userId: vendorId },
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
        const updated = await prisma_1.default.order.update({
            where: { id: orderId },
            data: { status: data.status },
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
        await prisma_1.default.notification.create({
            data: {
                userId: order.userId,
                title: 'Order Status Updated',
                message: `Your order #${orderId} status has been updated to ${data.status}`,
                type: 'ORDER',
            },
        });
        return {
            id: updated.id,
            quantity: updated.quantity,
            totalPrice: updated.totalPrice,
            status: updated.status,
            orderDate: updated.orderDate,
            produce: {
                id: updated.produce.id,
                name: updated.produce.name,
                vendor: {
                    farmName: updated.produce.vendor.farmName,
                },
            },
        };
    }
}
exports.MarketplaceService = MarketplaceService;
//# sourceMappingURL=marketplace.service.js.map