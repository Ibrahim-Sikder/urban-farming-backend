// modules/user/user.service.ts
import prisma from '../../config/prisma';
import { DashboardStatsResponse, OrdersResponse, RentalResponse, PlantResponse } from './user.type';

export class UserService {

    static async getDashboardStats(userId: number): Promise<DashboardStatsResponse> {
        const [
            orderCount,
            rentalCount,
            plantCount,
            postCount,
            recentOrders,
            recentPlants,
        ] = await Promise.all([
            prisma.order.count({ where: { userId } }),
            prisma.rentalBooking.count({ where: { userId } }),
            prisma.plantTracking.count({ where: { userId } }),
            prisma.communityPost.count({ where: { userId } }),
            prisma.order.findMany({
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
            prisma.plantTracking.findMany({
                where: { userId },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    plantName: true,
                    healthStatus: true,
                    growthStage: true,
                    createdAt: true,
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
            recentOrders,
            recentPlants,
        };
    }

    static async getOrders(userId: number, page: number, limit: number): Promise<OrdersResponse> {
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
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
            prisma.order.count({ where: { userId } }),
        ]);

        return {
            orders,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    static async getRentals(userId: number): Promise<RentalResponse[]> {
        return prisma.rentalBooking.findMany({
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

    static async getPlants(userId: number): Promise<PlantResponse[]> {
        return prisma.plantTracking.findMany({
            where: { userId, isActive: true },
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