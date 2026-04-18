import { HealthStatus, GrowthStage } from '@prisma/client';
import { PaginationParams, DateRangeFilter } from '../../shared/types/common.types';
export interface PlantQueryParams extends PaginationParams {
    healthStatus?: HealthStatus;
    growthStage?: GrowthStage;
    plantType?: string;
    dateRange?: DateRangeFilter;
}

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

export interface PlantResponse {
    id: number;
    plantName: string;
    plantType: string;
    plantedDate: Date;
    expectedHarvestDate: Date;
    actualHarvestDate?: Date | null;
    healthStatus: HealthStatus;
    growthStage: GrowthStage;
    notes?: string | null;
    lastUpdated: Date;
    createdAt: Date;
}

export { PaginatedResponse } from '../../shared/types/common.types';