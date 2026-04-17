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
            prisma.plantTracking.findMany({
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

    static async getOrders(userId: number, page: number, limit: number): Promise<OrdersResponse> {
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
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
            prisma.order.count({ where: { userId } }),
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

    static async getRentals(userId: number): Promise<RentalResponse[]> {
        const rentals = await prisma.rentalBooking.findMany({
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

    static async getPlants(userId: number): Promise<PlantResponse[]> {
        const plants = await prisma.plantTracking.findMany({
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