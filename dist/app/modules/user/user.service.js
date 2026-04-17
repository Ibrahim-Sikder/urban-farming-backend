"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
class UserService {
    static async getDashboardStats(userId) {
        const cacheKey = `user:dashboard:${userId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const [orderCount, rentalCount, plantCount, postCount, unreadNotificationCount, recentOrders, recentPlants, recentNotifications] = await Promise.all([
            prisma_1.default.order.count({ where: { userId } }),
            prisma_1.default.rentalBooking.count({ where: { userId } }),
            prisma_1.default.plantTracking.count({ where: { userId } }),
            prisma_1.default.communityPost.count({ where: { userId } }),
            prisma_1.default.notification.count({ where: { userId, isRead: false } }),
            prisma_1.default.order.findMany({
                where: { userId },
                take: 5,
                orderBy: { orderDate: 'desc' },
                select: {
                    id: true,
                    totalPrice: true,
                    status: true,
                    orderDate: true,
                    produce: { select: { name: true } }
                }
            }),
            prisma_1.default.plantTracking.findMany({
                where: { userId },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    plantName: true,
                    healthStatus: true,
                    growthStage: true,
                    plantedDate: true,
                }
            }),
            prisma_1.default.notification.findMany({
                where: { userId, isRead: false },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    message: true,
                    type: true,
                    isRead: true,
                    createdAt: true,
                }
            })
        ]);
        const response = {
            stats: {
                totalOrders: orderCount,
                totalRentals: rentalCount,
                totalPlants: plantCount,
                totalPosts: postCount,
                totalUnreadNotifications: unreadNotificationCount,
            },
            recentOrders: recentOrders.map(order => ({
                id: order.id,
                totalPrice: order.totalPrice,
                status: order.status,
                orderDate: order.orderDate,
                produce: { name: order.produce.name }
            })),
            recentPlants,
            recentNotifications,
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async getOrders(userId, params = {}) {
        const cacheKey = `user:orders:${userId}:${JSON.stringify(params)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const page = params.page || 1;
        const limit = Math.min(50, params.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = params.sortBy || 'orderDate';
        const sortOrder = params.sortOrder || 'desc';
        const where = { userId };
        if (params.status) {
            where.status = params.status;
        }
        if (params.dateRange?.startDate || params.dateRange?.endDate) {
            where.orderDate = {};
            if (params.dateRange.startDate)
                where.orderDate.gte = params.dateRange.startDate;
            if (params.dateRange.endDate)
                where.orderDate.lte = params.dateRange.endDate;
        }
        const [orders, total] = await Promise.all([
            prisma_1.default.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                select: {
                    id: true,
                    quantity: true,
                    totalPrice: true,
                    status: true,
                    orderDate: true,
                    produce: {
                        select: {
                            name: true,
                            vendor: { select: { farmName: true } }
                        }
                    }
                }
            }),
            prisma_1.default.order.count({ where })
        ]);
        const totalPages = Math.ceil(total / limit);
        const response = {
            orders: orders.map(order => ({
                id: order.id,
                quantity: order.quantity,
                totalPrice: order.totalPrice,
                status: order.status,
                orderDate: order.orderDate,
                produce: {
                    name: order.produce.name,
                    vendor: { farmName: order.produce.vendor.farmName }
                }
            })),
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
    static async getRentals(userId, params = {}) {
        const cacheKey = `user:rentals:${userId}:${JSON.stringify(params)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const page = params.page || 1;
        const limit = Math.min(50, params.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = params.sortBy || 'orderDate';
        const sortOrder = params.sortOrder || 'desc';
        const where = { userId };
        if (params.status) {
            where.status = params.status;
        }
        const [rentals, total] = await Promise.all([
            prisma_1.default.rentalBooking.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                    orderDate: true,
                    space: {
                        select: {
                            location: true,
                            size: true,
                            price: true,
                        }
                    }
                }
            }),
            prisma_1.default.rentalBooking.count({ where })
        ]);
        const totalPages = Math.ceil(total / limit);
        const response = {
            rentals: rentals.map(rental => ({
                id: rental.id,
                startDate: rental.startDate,
                endDate: rental.endDate,
                status: rental.status,
                orderDate: rental.orderDate,
                space: {
                    location: rental.space.location,
                    size: rental.space.size,
                    price: rental.space.price,
                }
            })),
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
    static async getPlants(userId, params = {}) {
        const cacheKey = `user:plants:${userId}:${JSON.stringify(params)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const page = params.page || 1;
        const limit = Math.min(50, params.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = params.sortBy || 'lastUpdated';
        const sortOrder = params.sortOrder || 'desc';
        const where = { userId };
        if (params.healthStatus) {
            where.healthStatus = params.healthStatus;
        }
        if (params.growthStage) {
            where.growthStage = params.growthStage;
        }
        const [plants, total] = await Promise.all([
            prisma_1.default.plantTracking.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                select: {
                    id: true,
                    plantName: true,
                    plantType: true,
                    plantedDate: true,
                    expectedHarvestDate: true,
                    actualHarvestDate: true,
                    healthStatus: true,
                    growthStage: true,
                    notes: true,
                    lastUpdated: true,
                    createdAt: true,
                }
            }),
            prisma_1.default.plantTracking.count({ where })
        ]);
        const totalPages = Math.ceil(total / limit);
        const response = {
            plants: plants.map(plant => ({
                id: plant.id,
                plantName: plant.plantName,
                plantType: plant.plantType,
                plantedDate: plant.plantedDate,
                expectedHarvestDate: plant.expectedHarvestDate,
                actualHarvestDate: plant.actualHarvestDate || undefined,
                healthStatus: plant.healthStatus,
                growthStage: plant.growthStage,
                notes: plant.notes || undefined,
                lastUpdated: plant.lastUpdated,
                createdAt: plant.createdAt,
            })),
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
    static async getPlantById(userId, plantId) {
        const cacheKey = `user:plant:${userId}:${plantId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const plant = await prisma_1.default.plantTracking.findFirst({
            where: { id: plantId, userId },
            select: {
                id: true,
                plantName: true,
                plantType: true,
                plantedDate: true,
                expectedHarvestDate: true,
                actualHarvestDate: true,
                healthStatus: true,
                growthStage: true,
                notes: true,
                lastUpdated: true,
                createdAt: true,
            }
        });
        if (!plant) {
            return null;
        }
        const response = {
            id: plant.id,
            plantName: plant.plantName,
            plantType: plant.plantType,
            plantedDate: plant.plantedDate,
            expectedHarvestDate: plant.expectedHarvestDate,
            actualHarvestDate: plant.actualHarvestDate || undefined,
            healthStatus: plant.healthStatus,
            growthStage: plant.growthStage,
            notes: plant.notes || undefined,
            lastUpdated: plant.lastUpdated,
            createdAt: plant.createdAt,
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 300);
        return response;
    }
    static async getOrderById(userId, orderId) {
        const cacheKey = `user:order:${userId}:${orderId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const order = await prisma_1.default.order.findFirst({
            where: { id: orderId, userId },
            select: {
                id: true,
                quantity: true,
                totalPrice: true,
                status: true,
                orderDate: true,
                produce: {
                    select: {
                        name: true,
                        description: true,
                        price: true,
                        category: true,
                        vendor: {
                            select: {
                                farmName: true,
                                farmLocation: true,
                                user: {
                                    select: {
                                        name: true,
                                        email: true,
                                        phoneNumber: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!order) {
            return null;
        }
        const response = {
            id: order.id,
            quantity: order.quantity,
            totalPrice: order.totalPrice,
            status: order.status,
            orderDate: order.orderDate,
            produce: {
                name: order.produce.name,
                description: order.produce.description,
                price: order.produce.price,
                category: order.produce.category,
                vendor: {
                    farmName: order.produce.vendor.farmName,
                    farmLocation: order.produce.vendor.farmLocation,
                    user: order.produce.vendor.user,
                }
            }
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 300);
        return response;
    }
    static async getRentalById(userId, rentalId) {
        const cacheKey = `user:rental:${userId}:${rentalId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const rental = await prisma_1.default.rentalBooking.findFirst({
            where: { id: rentalId, userId },
            select: {
                id: true,
                startDate: true,
                endDate: true,
                status: true,
                orderDate: true,
                space: {
                    select: {
                        location: true,
                        size: true,
                        price: true,
                        vendor: {
                            select: {
                                farmName: true,
                                user: {
                                    select: {
                                        name: true,
                                        email: true,
                                        phoneNumber: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!rental) {
            return null;
        }
        const response = {
            id: rental.id,
            startDate: rental.startDate,
            endDate: rental.endDate,
            status: rental.status,
            orderDate: rental.orderDate,
            space: {
                location: rental.space.location,
                size: rental.space.size,
                price: rental.space.price,
            }
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 300);
        return response;
    }
    static async invalidateUserCaches(userId) {
        await Promise.all([
            redis_cache_service_1.default.delPattern(`user:dashboard:${userId}`),
            redis_cache_service_1.default.delPattern(`user:orders:${userId}:*`),
            redis_cache_service_1.default.delPattern(`user:rentals:${userId}:*`),
            redis_cache_service_1.default.delPattern(`user:plants:${userId}:*`),
            redis_cache_service_1.default.delPattern(`user:plant:${userId}:*`),
            redis_cache_service_1.default.delPattern(`user:order:${userId}:*`),
            redis_cache_service_1.default.delPattern(`user:rental:${userId}:*`),
        ]);
    }
}
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map