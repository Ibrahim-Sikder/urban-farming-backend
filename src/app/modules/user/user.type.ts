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
        createdAt: Date;
        produce: {
            name: string;
            images: string[];
        };
    }>;
    recentPlants: Array<{
        id: number;
        plantName: string;
        healthStatus: string;
        growthStage: string;
        createdAt: Date;
    }>;
}

export interface OrdersResponse {
    orders: Array<{
        id: number;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        status: string;
        paymentStatus: string;
        deliveryAddress: string;
        deliveryDate?: Date;
        trackingNumber?: string;
        createdAt: Date;
        produce: {
            name: string;
            images: string[];
            vendor: {
                user: {
                    name: string;
                };
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
    totalPrice: number;
    status: string;
    paymentStatus: string;
    createdAt: Date;
    space: {
        name: string;
        location: string;
        size: number;
        pricePerMonth: number;
        images: string[];
        vendor: {
            user: {
                name: string;
            };
        };
    };
}

export interface PlantResponse {
    id: number;
    plantName: string;
    plantType: string;
    variety?: string;
    plantedDate: Date;
    expectedHarvestDate: Date;
    actualHarvestDate?: Date;
    healthStatus: string;
    growthStage: string;
    temperature?: number;
    humidity?: number;
    soilMoisture?: number;
    lightExposure?: string;
    lastWatered?: Date;
    lastFertilized?: Date;
    notes?: string;
    images: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    growthLogs: Array<{
        id: number;
        height?: number;
        leafCount?: number;
        healthStatus: string;
        growthStage: string;
        notes?: string;
        imageUrl?: string;
        recordedAt: Date;
    }>;
}