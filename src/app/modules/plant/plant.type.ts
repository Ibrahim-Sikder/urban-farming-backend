
import { HealthStatus, GrowthStage } from '@prisma/client';

// ============ INPUT TYPES ============
export interface CreatePlantInput {
    plantName: string;
    plantType: string;
    plantedDate: Date;
    expectedHarvestDate: Date;
    notes?: string;
}

export interface UpdatePlantInput {
    plantName?: string;
    plantType?: string;
    expectedHarvestDate?: Date;
    healthStatus?: HealthStatus;
    growthStage?: GrowthStage;
    notes?: string;
}

export interface UpdateHealthStatusInput {
    healthStatus: HealthStatus;
    growthStage: GrowthStage;
    notes?: string;
}

// ============ RESPONSE TYPES ============
export interface PlantResponse {
    id: number;
    plantName: string;
    plantType: string;
    plantedDate: Date;
    expectedHarvestDate: Date;
    actualHarvestDate?: Date;
    healthStatus: HealthStatus;
    growthStage: GrowthStage;
    notes?: string;
    lastUpdated: Date;
    createdAt: Date;
}

export interface PlantWithUserResponse extends PlantResponse {
    user: {
        id: number;
        name: string;
        email: string;
    };
}