"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
class UserService {
    static async getDashboardStats(userId) {
        const [orderCount, rentalCount, plantCount, postCount, recentOrders, recentPlants,] = await Promise.all([
            prisma_1.default.order.count({ where: { userId } }),
            prisma_1.default.rentalBooking.count({ where: { userId } }),
            prisma_1.default.plantTracking.count({ where: { userId } }),
            prisma_1.default.communityPost.count({ where: { userId } }),
            prisma_1.default.order.findMany({
                where: { userId },
                take: 5,
                orderBy: {
                    orderDate: 'desc'
                },
                include: {
                    produce: {
                        select: {
                            name: true,
                        },
                    },
                },
            }),
            prisma_1.default.plantTracking.findMany({
                where: { userId },
                take: 5,
                orderBy: {
                    createdAt: 'desc'
                },
                select: {
                    id: true,
                    plantName: true,
                    healthStatus: true,
                    growthStage: true,
                    plantedDate: true,
                },
            }),
        ]);
        return {
            stats: {
                totalOrders: orderCount,
                totalRentals: rentalCount,
                totalPlants: plantCount,
                totalPosts: postCount,
            },
            recentOrders: recentOrders.map(order => ({
                id: order.id,
                totalPrice: order.totalPrice,
                status: order.status,
                orderDate: order.orderDate,
                produce: {
                    name: order.produce.name,
                },
            })),
            recentPlants,
        };
    }
    static async getOrders(userId, page, limit) {
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            prisma_1.default.order.findMany({
                where: { userId },
                skip,
                take: limit,
                orderBy: {
                    orderDate: 'desc'
                },
                include: {
                    produce: {
                        include: {
                            vendor: {
                                select: {
                                    farmName: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma_1.default.order.count({ where: { userId } }),
        ]);
        return {
            orders: orders.map(order => ({
                id: order.id,
                quantity: order.quantity,
                totalPrice: order.totalPrice,
                status: order.status,
                orderDate: order.orderDate,
                produce: {
                    name: order.produce.name,
                    vendor: {
                        farmName: order.produce.vendor.farmName,
                    },
                },
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async getRentals(userId) {
        const rentals = await prisma_1.default.rentalBooking.findMany({
            where: { userId },
            include: {
                space: {
                    select: {
                        location: true,
                        size: true,
                        price: true,
                    },
                },
            },
            orderBy: {
                orderDate: 'desc'
            },
        });
        return rentals.map(rental => ({
            id: rental.id,
            startDate: rental.startDate,
            endDate: rental.endDate,
            status: rental.status,
            orderDate: rental.orderDate,
            space: {
                location: rental.space.location,
                size: rental.space.size,
                price: rental.space.price,
            },
        }));
    }
    static async getPlants(userId) {
        const plants = await prisma_1.default.plantTracking.findMany({
            where: { userId },
            orderBy: {
                lastUpdated: 'desc'
            },
        });
        return plants.map(plant => ({
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
        }));
    }
}
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map