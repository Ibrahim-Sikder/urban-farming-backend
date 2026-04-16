import prisma from '../../config/prisma';

export class UserService {

    static async getDashboardStats(userId: number) {
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

    static async getOrders(userId: number, page: number, limit: number) {
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

        return { orders, total, page, limit };
    }

    static async getRentals(userId: number) {
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

    static async getPlants(userId: number) {
        return prisma.plantTracking.findMany({
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