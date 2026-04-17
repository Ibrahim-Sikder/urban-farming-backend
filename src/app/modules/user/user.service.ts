import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import {
    DashboardStatsResponse,
    OrdersResponse,
    RentalResponse,
    PlantResponse,
    UserOrderQueryParams,
    UserRentalQueryParams,
    UserPlantQueryParams,
    PaginatedRentalsResponse,
    PaginatedPlantsResponse
} from './user.type';

export class UserService {
    static async getDashboardStats(userId: number): Promise<DashboardStatsResponse> {
        const cacheKey = `user:dashboard:${userId}`;

        const cached = await RedisCacheService.getFast<DashboardStatsResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const [
            orderCount,
            rentalCount,
            plantCount,
            postCount,
            unreadNotificationCount,
            recentOrders,
            recentPlants,
            recentNotifications
        ] = await Promise.all([
            prisma.order.count({ where: { userId } }),
            prisma.rentalBooking.count({ where: { userId } }),
            prisma.plantTracking.count({ where: { userId } }),
            prisma.communityPost.count({ where: { userId } }),
            prisma.notification.count({ where: { userId, isRead: false } }),
            prisma.order.findMany({
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
            prisma.plantTracking.findMany({
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
            prisma.notification.findMany({
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

        const response: DashboardStatsResponse = {
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
        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }
    static async getOrders(userId: number, params: UserOrderQueryParams = {}): Promise<OrdersResponse> {
        const cacheKey = `user:orders:${userId}:${JSON.stringify(params)}`;

        const cached = await RedisCacheService.getFast<OrdersResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const page = params.page || 1;
        const limit = Math.min(50, params.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = params.sortBy || 'orderDate';
        const sortOrder = params.sortOrder || 'desc';
        const where: any = { userId };

        if (params.status) {
            where.status = params.status;
        }

        if (params.dateRange?.startDate || params.dateRange?.endDate) {
            where.orderDate = {};
            if (params.dateRange.startDate) where.orderDate.gte = params.dateRange.startDate;
            if (params.dateRange.endDate) where.orderDate.lte = params.dateRange.endDate;
        }

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
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
            prisma.order.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        const response: OrdersResponse = {
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

        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }

    static async getRentals(userId: number, params: UserRentalQueryParams = {}): Promise<PaginatedRentalsResponse> {
        const cacheKey = `user:rentals:${userId}:${JSON.stringify(params)}`;

        const cached = await RedisCacheService.getFast<PaginatedRentalsResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const page = params.page || 1;
        const limit = Math.min(50, params.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = params.sortBy || 'orderDate';
        const sortOrder = params.sortOrder || 'desc';
        const where: any = { userId };

        if (params.status) {
            where.status = params.status;
        }

        const [rentals, total] = await Promise.all([
            prisma.rentalBooking.findMany({
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
            prisma.rentalBooking.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        const response: PaginatedRentalsResponse = {
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

        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }

    static async getPlants(userId: number, params: UserPlantQueryParams = {}): Promise<PaginatedPlantsResponse> {
        const cacheKey = `user:plants:${userId}:${JSON.stringify(params)}`;
        const cached = await RedisCacheService.getFast<PaginatedPlantsResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const page = params.page || 1;
        const limit = Math.min(50, params.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = params.sortBy || 'lastUpdated';
        const sortOrder = params.sortOrder || 'desc';
        const where: any = { userId };

        if (params.healthStatus) {
            where.healthStatus = params.healthStatus;
        }

        if (params.growthStage) {
            where.growthStage = params.growthStage;
        }

        const [plants, total] = await Promise.all([
            prisma.plantTracking.findMany({
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
            prisma.plantTracking.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        const response: PaginatedPlantsResponse = {
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

        await RedisCacheService.setFast(cacheKey, response, 120);

        return response;
    }

    static async getPlantById(userId: number, plantId: number): Promise<PlantResponse | null> {
        const cacheKey = `user:plant:${userId}:${plantId}`;

        const cached = await RedisCacheService.getFast<PlantResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const plant = await prisma.plantTracking.findFirst({
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

        const response: PlantResponse = {
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
        await RedisCacheService.setFast(cacheKey, response, 300);

        return response;
    }

    static async getOrderById(userId: number, orderId: number): Promise<any | null> {
        const cacheKey = `user:order:${userId}:${orderId}`;

        const cached = await RedisCacheService.getFast<any>(cacheKey);
        if (cached) {
            return cached;
        }

        const order = await prisma.order.findFirst({
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
        await RedisCacheService.setFast(cacheKey, response, 300);

        return response;
    }

    static async getRentalById(userId: number, rentalId: number): Promise<RentalResponse | null> {
        const cacheKey = `user:rental:${userId}:${rentalId}`;

        const cached = await RedisCacheService.getFast<RentalResponse>(cacheKey);
        if (cached) {
            return cached;
        }

        const rental = await prisma.rentalBooking.findFirst({
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

        const response: RentalResponse = {
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

        await RedisCacheService.setFast(cacheKey, response, 300);

        return response;
    }

    static async invalidateUserCaches(userId: number): Promise<void> {
        await Promise.all([
            RedisCacheService.delPattern(`user:dashboard:${userId}`),
            RedisCacheService.delPattern(`user:orders:${userId}:*`),
            RedisCacheService.delPattern(`user:rentals:${userId}:*`),
            RedisCacheService.delPattern(`user:plants:${userId}:*`),
            RedisCacheService.delPattern(`user:plant:${userId}:*`),
            RedisCacheService.delPattern(`user:order:${userId}:*`),
            RedisCacheService.delPattern(`user:rental:${userId}:*`),
        ]);
    }
}