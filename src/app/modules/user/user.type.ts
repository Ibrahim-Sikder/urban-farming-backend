// modules/user/user.type.ts

export interface DashboardStatsResponse {
    stats: {
        totalOrders: number;
        totalRentals: number;
        totalPlants: number;
        totalPosts: number;
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
    total: number;
    page: number;
    limit: number;
    totalPages: number;
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