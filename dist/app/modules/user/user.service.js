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
                orderBy: { createdAt: 'desc' },
                include: {
                    produce: {
                        select: {
                            name: true,
                            images: true,
                        },
                    },
                },
            }),
            prisma_1.default.plantTracking.findMany({
                where: { userId },
                take: 5,
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return {
            stats: {
                totalOrders: orderCount,
                totalRentals: rentalCount,
                totalPlants: plantCount,
                totalPosts: postCount,
            },
            recentOrders,
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
                orderBy: { createdAt: 'desc' },
                include: {
                    produce: {
                        select: {
                            name: true,
                            images: true,
                            vendor: {
                                include: {
                                    user: {
                                        select: {
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            prisma_1.default.order.count({ where: { userId } }),
        ]);
        return { orders, total, page, limit };
    }
    static async getRentals(userId) {
        return prisma_1.default.rentalBooking.findMany({
            where: { userId },
            include: {
                space: {
                    include: {
                        vendor: {
                            include: {
                                user: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    static async getPlants(userId) {
        return prisma_1.default.plantTracking.findMany({
            where: { userId },
            include: {
                growthLogs: {
                    take: 5,
                    orderBy: { recordedAt: 'desc' },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
}
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map