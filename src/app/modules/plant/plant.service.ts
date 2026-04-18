import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import socketService from '../../services/socket.service';
import { PrismaQueryBuilder, PaginatedResult } from '../../shared/utils/prisma-query-builder';
import {
    CreatePlantInput,
    UpdatePlantInput,
    UpdateHealthStatusInput,
    PlantResponse,
    PlantQueryParams,
} from './plant.type';

export class PlantService {

    // ============ CREATE PLANT (Optimized) ============
    static async createPlant(userId: number, data: CreatePlantInput): Promise<PlantResponse> {
        const startTime = Date.now();

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

        // Async cache clearing (don't block response)
        setImmediate(() => {
            RedisCacheService.clearUserPaginatedCache('plants', userId).catch(console.error);
            RedisCacheService.delete('plants:stats', userId).catch(console.error);
        });

        const duration = Date.now() - startTime;
        console.log(`✅ Plant created in ${duration}ms`);

        return plant as PlantResponse;
    }

    // ============ GET USER PLANTS (Ultra Fast) ============
    static async getUserPlants(
        userId: number,
        queryParams: PlantQueryParams
    ): Promise<PaginatedResult<PlantResponse>> {
        const startTime = Date.now();

        // Try cache first
        const cached = await RedisCacheService.getPaginated<PaginatedResult<PlantResponse>>(
            'plants',
            userId,
            queryParams as any
        );

        if (cached) {
            const duration = Date.now() - startTime;
            console.log(`✅ Cache HIT - ${duration}ms for user ${userId}`);
            return cached;
        }

        console.log(`📊 Cache MISS - Querying DB for user ${userId}`);
        const queryStart = Date.now();

        // Build optimized query
        const queryBuilder = new PrismaQueryBuilder('PlantTracking', queryParams as any);
        queryBuilder.setSearchFields(['plantName', 'plantType', 'notes']);
        queryBuilder.addCustomCondition(Prisma.sql`"userId" = ${userId}`);

        const customQuery = Prisma.sql`
            SELECT 
                id, "plantName", "plantType", "plantedDate",
                "expectedHarvestDate", "actualHarvestDate", "healthStatus",
                "growthStage", notes, "lastUpdated", "createdAt"
            FROM "PlantTracking"
        `;

        const result = await queryBuilder.execute<PlantResponse>(customQuery);

        const queryTime = Date.now() - queryStart;
        console.log(`📊 DB Query: ${queryTime}ms for ${result.data.length} plants`);

        // Cache asynchronously
        setImmediate(() => {
            RedisCacheService.setPaginated('plants', userId, queryParams as any, result, 120).catch(console.error);
        });

        const totalTime = Date.now() - startTime;
        console.log(`📊 Total response: ${totalTime}ms (DB: ${queryTime}ms)`);

        return result;
    }

    // ============ GET ALL PLANTS (Admin) ============
    static async getAllPlants(queryParams: PlantQueryParams): Promise<PaginatedResult<PlantResponse>> {
        const startTime = Date.now();

        const cached = await RedisCacheService.getPaginated<PaginatedResult<PlantResponse>>(
            'plants:all',
            null,
            queryParams as any
        );

        if (cached) {
            const duration = Date.now() - startTime;
            console.log(`✅ Admin cache HIT - ${duration}ms`);
            return cached;
        }

        const queryBuilder = new PrismaQueryBuilder('PlantTracking', queryParams as any);
        queryBuilder.setSearchFields(['plantName', 'plantType', 'notes']);

        const customQuery = Prisma.sql`
            SELECT 
                p.id, p."plantName", p."plantType", p."plantedDate",
                p."expectedHarvestDate", p."actualHarvestDate", p."healthStatus",
                p."growthStage", p.notes, p."lastUpdated", p."createdAt",
                u.name as "userName", u.email as "userEmail"
            FROM "PlantTracking" p
            LEFT JOIN "User" u ON p."userId" = u.id
        `;

        const result = await queryBuilder.execute<PlantResponse>(customQuery);

        setImmediate(() => {
            RedisCacheService.setPaginated('plants:all', null, queryParams as any, result, 120).catch(console.error);
        });

        return result;
    }

    // ============ GET PLANT BY ID (Optimized) ============
    static async getPlantById(userId: number, plantId: number): Promise<PlantResponse> {
        const startTime = Date.now();

        const cached = await RedisCacheService.get<PlantResponse>('plant', `${userId}:${plantId}`);
        if (cached) {
            const duration = Date.now() - startTime;
            console.log(`✅ Plant cache HIT - ${duration}ms`);
            return cached;
        }

        const plant = await prisma.plantTracking.findFirst({
            where: { id: plantId, userId },
            select: {
                id: true, plantName: true, plantType: true, plantedDate: true,
                expectedHarvestDate: true, actualHarvestDate: true, healthStatus: true,
                growthStage: true, notes: true, lastUpdated: true, createdAt: true,
            }
        });

        if (!plant) {
            throw new Error('Plant not found');
        }

        setImmediate(() => {
            RedisCacheService.set('plant', `${userId}:${plantId}`, plant, 300).catch(console.error);
        });

        const duration = Date.now() - startTime;
        console.log(`📊 Plant DB query: ${duration}ms`);

        return plant as PlantResponse;
    }

    // ============ UPDATE PLANT ============
    static async updatePlant(userId: number, plantId: number, data: UpdatePlantInput): Promise<PlantResponse> {
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

        // Clear caches in parallel
        await Promise.all([
            RedisCacheService.clearUserPaginatedCache('plants', userId),
            RedisCacheService.delete('plant', `${userId}:${plantId}`),
            RedisCacheService.delete('plants:stats', userId),
        ]);

        return updated as PlantResponse;
    }

    // ============ UPDATE HEALTH STATUS (With Socket) ============
    static async updateHealthStatus(userId: number, plantId: number, data: UpdateHealthStatusInput): Promise<PlantResponse> {
        const plant = await prisma.plantTracking.findFirst({
            where: { id: plantId, userId },
            select: { plantName: true }
        });

        if (!plant) {
            throw new Error('Plant not found');
        }

        const updated = await prisma.plantTracking.update({
            where: { id: plantId },
            data: {
                healthStatus: data.healthStatus,
                growthStage: data.growthStage,
                notes: data.notes,
            },
        });

        // Fire-and-forget socket events (don't await)
        socketService.sendPlantUpdate(userId, {
            plantId, plantName: plant.plantName, status: data.healthStatus,
            healthStatus: data.healthStatus, growthStage: data.growthStage, timestamp: new Date()
        }).catch(console.error);

        if (data.healthStatus === 'HARVEST_READY') {
            socketService.sendPlantReadyForHarvest(userId, plantId, plant.plantName).catch(console.error);
        }

        // Clear caches
        await Promise.all([
            RedisCacheService.clearUserPaginatedCache('plants', userId),
            RedisCacheService.delete('plant', `${userId}:${plantId}`),
            RedisCacheService.delete('plants:stats', userId),
        ]);

        return updated as PlantResponse;
    }

    // ============ MARK AS HARVESTED ============
    static async markAsHarvested(userId: number, plantId: number): Promise<PlantResponse> {
        const plant = await prisma.plantTracking.findFirst({
            where: { id: plantId, userId },
            select: { plantName: true }
        });

        if (!plant) {
            throw new Error('Plant not found');
        }

        const updated = await prisma.plantTracking.update({
            where: { id: plantId },
            data: {
                actualHarvestDate: new Date(),
                healthStatus: 'HARVEST_READY',
                growthStage: 'HARVESTING',
            },
        });

        // Fire-and-forget notification
        socketService.sendNotification(userId, 'Plant Harvested', `${plant.plantName} has been harvested successfully!`, 'PLANT_HARVEST').catch(console.error);

        await Promise.all([
            RedisCacheService.clearUserPaginatedCache('plants', userId),
            RedisCacheService.delete('plant', `${userId}:${plantId}`),
            RedisCacheService.delete('plants:stats', userId),
        ]);

        return updated as PlantResponse;
    }

    // ============ DELETE PLANT ============
    static async deletePlant(userId: number, plantId: number): Promise<{ message: string }> {
        await prisma.plantTracking.delete({ where: { id: plantId } });

        await Promise.all([
            RedisCacheService.clearUserPaginatedCache('plants', userId),
            RedisCacheService.delete('plant', `${userId}:${plantId}`),
            RedisCacheService.delete('plants:stats', userId),
        ]);

        return { message: 'Plant deleted successfully' };
    }

    // ============ GET PLANT STATISTICS (Ultra Fast) ============
    static async getPlantStats(userId: number): Promise<any> {
        const startTime = Date.now();

        const cached = await RedisCacheService.get('plants:stats', userId);
        if (cached) {
            const duration = Date.now() - startTime;
            console.log(`✅ Stats cache HIT - ${duration}ms`);
            return cached;
        }

        // Use single optimized query with Prisma's aggregate
        const stats = await prisma.plantTracking.groupBy({
            by: ['healthStatus', 'growthStage'],
            where: { userId },
            _count: true,
        });

        // Process results efficiently
        let totalPlants = 0;
        let healthy = 0, moderate = 0, critical = 0, harvestReady = 0;
        let seedling = 0, vegetative = 0, flowering = 0, fruiting = 0, harvesting = 0;

        for (const stat of stats) {
            const count = stat._count;
            totalPlants += count;

            switch (stat.healthStatus) {
                case 'HEALTHY': healthy = count; break;
                case 'MODERATE': moderate = count; break;
                case 'CRITICAL': critical = count; break;
                case 'HARVEST_READY': harvestReady = count; break;
            }

            switch (stat.growthStage) {
                case 'SEEDLING': seedling = count; break;
                case 'VEGETATIVE': vegetative = count; break;
                case 'FLOWERING': flowering = count; break;
                case 'FRUITING': fruiting = count; break;
                case 'HARVESTING': harvesting = count; break;
            }
        }

        const formattedStats = {
            totalPlants, healthyPlants: healthy, moderatePlants: moderate,
            criticalPlants: critical, readyForHarvest: harvestReady,
            byGrowthStage: { seedling, vegetative, flowering, fruiting, harvesting }
        };

        // Cache stats
        await RedisCacheService.set('plants:stats', userId, formattedStats, 60);

        const duration = Date.now() - startTime;
        console.log(`📊 Stats computed in ${duration}ms`);

        return formattedStats;
    }
}