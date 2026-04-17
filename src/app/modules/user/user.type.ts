import { OrderStatus } from '@prisma/client';
import { PaginationParams, DateRangeFilter } from '../../shared/types/common.types';

export interface UserOrderQueryParams extends PaginationParams {
    status?: OrderStatus;
    dateRange?: DateRangeFilter;
}

export interface UserRentalQueryParams extends PaginationParams {
    status?: OrderStatus;
}

export interface UserPlantQueryParams extends PaginationParams {
    healthStatus?: string;
    growthStage?: string;
}

export interface DashboardStatsResponse {
    stats: {
        totalOrders: number;
        totalRentals: number;
        totalPlants: number;
        totalPosts: number;
        totalUnreadNotifications: number;
    };
    recentOrders: Array<{
        id: number;
        totalPrice: number;
        status: string;
        orderDate: Date;
        produce: {
            name: string;
        };
    }>;
    recentPlants: Array<{
        id: number;
        plantName: string;
        healthStatus: string;
        growthStage: string;
        plantedDate: Date;
    }>;
    recentNotifications: Array<{
        id: number;
        title: string;
        message: string;
        type: string;
        isRead: boolean;
        createdAt: Date;
    }>;
}

export interface OrdersResponse {
    orders: Array<{
        id: number;
        quantity: number;
        totalPrice: number;
        status: string;
        orderDate: Date;
        produce: {
            name: string;
            vendor: {
                farmName: string;
            };
        };
    }>;
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export interface RentalResponse {
    id: number;
    startDate: Date;
    endDate: Date;
    status: string;
    orderDate: Date;
    space: {
        location: string;
        size: number;
        price: number;
    };
}

export interface PaginatedRentalsResponse {
    rentals: RentalResponse[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export interface PlantResponse {
    id: number;
    plantName: string;
    plantType: string;
    plantedDate: Date;
    expectedHarvestDate: Date;
    actualHarvestDate?: Date;
    healthStatus: string;
    growthStage: string;
    notes?: string;
    lastUpdated: Date;
    createdAt: Date;
}

export interface PaginatedPlantsResponse {
    plants: PlantResponse[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export { PaginatedResponse } from '../../shared/types/common.types';