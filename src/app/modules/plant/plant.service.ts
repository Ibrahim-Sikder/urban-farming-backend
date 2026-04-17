import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import { PrismaQueryBuilder, PaginatedResult } from '../../shared/utils/prisma-query-builder';
import {
    CreatePlantInput,
    UpdatePlantInput,
    UpdateHealthStatusInput,
    PlantResponse,
    PlantQueryParams,
} from './plant.type';

export class PlantService {

    // ============ CREATE PLANT ============
    static async createPlant(userId: number, data: CreatePlantInput): Promise<PlantResponse> {
        const plant = await prisma.plantTracking.create({
            data: {
                userId,
                plantName: data.plantName,
                plantType: data.plantType,
                plantedDate: data.plantedDate,
                expectedHarvestDate: data.expectedHarvestDate,
                notes: data.notes,
                healthStatus: 'HEALTHY',
                growthStage: 'SEEDLING',
            },
        });

        // Clear cache in background
        setImmediate(() => {
            RedisCacheService.clearUserPlantsCache(userId).catch(console.error);
        });

        return plant as PlantResponse;
    }

    // ============ GET USER PLANTS WITH PAGINATION, FILTER, SEARCH, SORT ============
    static async getUserPlants(
        userId: number,
        queryParams: PlantQueryParams
    ): Promise<PaginatedResult<PlantResponse>> {
        // Create unique cache key based on query params
        const cacheKey = `plants:${userId}:${JSON.stringify(queryParams)}`;

        // Try cache first
        const cached = await RedisCacheService.getFast<PaginatedResult<PlantResponse>>(cacheKey);
        if (cached) {
            return cached;
        }

        // Build query using the reusable query builder
        const queryBuilder = new PrismaQueryBuilder('PlantTracking', queryParams as any);

        // Set searchable fields
        queryBuilder.setSearchFields(['plantName', 'plantType', 'notes']);

        // Add user filter using the correct method
        const userCondition = Prisma.sql`"userId" = ${userId}`;
        queryBuilder.addCustomCondition(userCondition);

        // Custom query with specific fields selection (without WHERE clause since builder adds it)
        const customQuery = Prisma.sql`
            SELECT 
                id,
                "plantName",
                "plantType",
                "plantedDate",
                "expectedHarvestDate",
                "actualHarvestDate",
                "healthStatus",
                "growthStage",
                notes,
                "lastUpdated",
                "createdAt"
            FROM "PlantTracking"
        `;

        // Execute query with pagination
        const result = await queryBuilder.execute<PlantResponse>(customQuery);

        // Cache for 2 minutes
        await RedisCacheService.setFast(cacheKey, result, 120);

        return result;
    }

    // ============ GET ALL PLANTS (ADMIN) WITH ADVANCED FILTERS ============
    static async getAllPlants(queryParams: PlantQueryParams): Promise<PaginatedResult<PlantResponse>> {
        const cacheKey = `plants:all:${JSON.stringify(queryParams)}`;

        const cached = await RedisCacheService.getFast<PaginatedResult<PlantResponse>>(cacheKey);
        if (cached) {
            return cached;
        }

        const queryBuilder = new PrismaQueryBuilder('PlantTracking', queryParams as any);

        // Set searchable fields
        queryBuilder.setSearchFields(['plantName', 'plantType', 'notes']);

        // Custom query with user info for admin
        const customQuery = Prisma.sql`
            SELECT 
                p.id,
                p."plantName",
                p."plantType",
                p."plantedDate",
                p."expectedHarvestDate",
                p."actualHarvestDate",
                p."healthStatus",
                p."growthStage",
                p.notes,
                p."lastUpdated",
                p."createdAt",
                u.name as "userName",
                u.email as "userEmail"
            FROM "PlantTracking" p
            LEFT JOIN "User" u ON p."userId" = u.id
        `;

        const result = await queryBuilder.execute<PlantResponse>(customQuery);

        await RedisCacheService.setFast(cacheKey, result, 120);

        return result;
    }

    // ============ GET PLANT BY ID ============
    static async getPlantById(userId: number, plantId: number): Promise<PlantResponse> {
        // Check cache
        const cached = await RedisCacheService.getCachedSinglePlant(userId, plantId);
        if (cached) {
            return cached;
        }

        // Direct query
        const plant = await prisma.$queryRaw<PlantResponse[]>`
            SELECT 
                id,
                "plantName",
                "plantType",
                "plantedDate",
                "expectedHarvestDate",
                "actualHarvestDate",
                "healthStatus",
                "growthStage",
                notes,
                "lastUpdated",
                "createdAt"
            FROM "PlantTracking"
            WHERE id = ${plantId} AND "userId" = ${userId}
            LIMIT 1
        `;

        if (!plant || plant.length === 0) {
            throw new Error('Plant not found');
        }

        // Cache
        await RedisCacheService.cacheSinglePlant(userId, plantId, plant[0]);

        return plant[0];
    }

    // ============ UPDATE PLANT ============
    static async updatePlant(userId: number, plantId: number, data: UpdatePlantInput): Promise<PlantResponse> {
        // First verify plant exists
        const existing = await this.getPlantById(userId, plantId);
        if (!existing) {
            throw new Error('Plant not found');
        }

        // Build update data
        const updateData: any = {};
        if (data.plantName !== undefined) updateData.plantName = data.plantName;
        if (data.plantType !== undefined) updateData.plantType = data.plantType;
        if (data.expectedHarvestDate !== undefined) updateData.expectedHarvestDate = data.expectedHarvestDate;
        if (data.healthStatus !== undefined) updateData.healthStatus = data.healthStatus;
        if (data.growthStage !== undefined) updateData.growthStage = data.growthStage;
        if (data.notes !== undefined) updateData.notes = data.notes;

        const updated = await prisma.plantTracking.update({
            where: { id: plantId },
            data: updateData,
        });

        // Clear all related caches with pattern
        await Promise.all([
            RedisCacheService.delPattern(`plants:${userId}:*`),
            RedisCacheService.clearSinglePlantCache(userId, plantId),
            RedisCacheService.del(`plants:stats:${userId}`),
        ]);

        return updated as PlantResponse;
    }

    // ============ UPDATE HEALTH STATUS ============
    static async updateHealthStatus(userId: number, plantId: number, data: UpdateHealthStatusInput): Promise<PlantResponse> {
        const updated = await prisma.plantTracking.update({
            where: { id: plantId },
            data: {
                healthStatus: data.healthStatus,
                growthStage: data.growthStage,
                notes: data.notes,
            },
        });

        // Clear caches
        await Promise.all([
            RedisCacheService.delPattern(`plants:${userId}:*`),
            RedisCacheService.clearSinglePlantCache(userId, plantId),
            RedisCacheService.del(`plants:stats:${userId}`),
        ]);

        return updated as PlantResponse;
    }

    // ============ MARK AS HARVESTED ============
    static async markAsHarvested(userId: number, plantId: number): Promise<PlantResponse> {
        const updated = await prisma.plantTracking.update({
            where: { id: plantId },
            data: {
                actualHarvestDate: new Date(),
                healthStatus: 'HARVEST_READY',
                growthStage: 'HARVESTING',
            },
        });

        // Clear caches
        await Promise.all([
            RedisCacheService.delPattern(`plants:${userId}:*`),
            RedisCacheService.clearSinglePlantCache(userId, plantId),
            RedisCacheService.del(`plants:stats:${userId}`),
        ]);

        return updated as PlantResponse;
    }

    // ============ DELETE PLANT ============
    static async deletePlant(userId: number, plantId: number): Promise<{ message: string }> {
        await prisma.plantTracking.delete({
            where: { id: plantId },
        });

        // Clear caches
        await Promise.all([
            RedisCacheService.delPattern(`plants:${userId}:*`),
            RedisCacheService.clearSinglePlantCache(userId, plantId),
            RedisCacheService.del(`plants:stats:${userId}`),
        ]);

        return { message: 'Plant deleted successfully' };
    }

    // ============ GET PLANT STATISTICS ============
    static async getPlantStats(userId: number): Promise<any> {
        // Check cache first
        const cached = await RedisCacheService.getCachedPlantStats(userId);
        if (cached) {
            return cached;
        }

        // Single optimized query for all stats
        const stats = await prisma.$queryRaw<Array<{
            total: number;
            healthy: number;
            moderate: number;
            critical: number;
            harvest_ready: number;
            seedling: number;
            vegetative: number;
            flowering: number;
            fruiting: number;
            harvesting: number;
        }>>`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN "healthStatus" = 'HEALTHY' THEN 1 END) as healthy,
                COUNT(CASE WHEN "healthStatus" = 'MODERATE' THEN 1 END) as moderate,
                COUNT(CASE WHEN "healthStatus" = 'CRITICAL' THEN 1 END) as critical,
                COUNT(CASE WHEN "healthStatus" = 'HARVEST_READY' THEN 1 END) as harvest_ready,
                COUNT(CASE WHEN "growthStage" = 'SEEDLING' THEN 1 END) as seedling,
                COUNT(CASE WHEN "growthStage" = 'VEGETATIVE' THEN 1 END) as vegetative,
                COUNT(CASE WHEN "growthStage" = 'FLOWERING' THEN 1 END) as flowering,
                COUNT(CASE WHEN "growthStage" = 'FRUITING' THEN 1 END) as fruiting,
                COUNT(CASE WHEN "growthStage" = 'HARVESTING' THEN 1 END) as harvesting
            FROM "PlantTracking"
            WHERE "userId" = ${userId}
        `;

        const result = stats[0] || {
            total: 0, healthy: 0, moderate: 0, critical: 0, harvest_ready: 0,
            seedling: 0, vegetative: 0, flowering: 0, fruiting: 0, harvesting: 0
        };

        const formattedStats = {
            totalPlants: Number(result.total),
            healthyPlants: Number(result.healthy),
            moderatePlants: Number(result.moderate),
            criticalPlants: Number(result.critical),
            readyForHarvest: Number(result.harvest_ready),
            byGrowthStage: {
                seedling: Number(result.seedling),
                vegetative: Number(result.vegetative),
                flowering: Number(result.flowering),
                fruiting: Number(result.fruiting),
                harvesting: Number(result.harvesting),
            }
        };

        // Cache stats
        await RedisCacheService.cachePlantStats(userId, formattedStats);

        return formattedStats;
    }
}