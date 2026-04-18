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

        await RedisCacheService.clearUserPaginatedCache('plants', userId);
        await RedisCacheService.delete('plants:stats', userId);

        return plant as PlantResponse;
    }

    static async getUserPlants(
        userId: number,
        queryParams: PlantQueryParams
    ): Promise<PaginatedResult<PlantResponse>> {
        const cached = await RedisCacheService.getPaginated<PaginatedResult<PlantResponse>>(
            'plants',
            userId,
            queryParams as any
        );
        if (cached) {
            return cached;
        }

        const queryBuilder = new PrismaQueryBuilder('PlantTracking', queryParams as any);
        queryBuilder.setSearchFields(['plantName', 'plantType', 'notes']);

        const userCondition = Prisma.sql`"userId" = ${userId}`;
        queryBuilder.addCustomCondition(userCondition);

        const customQuery = Prisma.sql`
            SELECT 
                id, "plantName", "plantType", "plantedDate",
                "expectedHarvestDate", "actualHarvestDate", "healthStatus",
                "growthStage", notes, "lastUpdated", "createdAt"
            FROM "PlantTracking"
        `;

        const result = await queryBuilder.execute<PlantResponse>(customQuery);
        await RedisCacheService.setPaginated('plants', userId, queryParams as any, result, 120);

        return result;
    }

    static async getAllPlants(queryParams: PlantQueryParams): Promise<PaginatedResult<PlantResponse>> {
        const cached = await RedisCacheService.getPaginated<PaginatedResult<PlantResponse>>(
            'plants:all',
            null,
            queryParams as any
        );
        if (cached) {
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
        await RedisCacheService.setPaginated('plants:all', null, queryParams as any, result, 120);

        return result;
    }
    static async getPlantById(userId: number, plantId: number): Promise<PlantResponse> {
        const cached = await RedisCacheService.get<PlantResponse>('plant', `${userId}:${plantId}`);
        if (cached) {
            return cached;
        }

        const plant = await prisma.$queryRaw<PlantResponse[]>`
            SELECT 
                id, "plantName", "plantType", "plantedDate",
                "expectedHarvestDate", "actualHarvestDate", "healthStatus",
                "growthStage", notes, "lastUpdated", "createdAt"
            FROM "PlantTracking"
            WHERE id = ${plantId} AND "userId" = ${userId}
            LIMIT 1
        `;

        if (!plant || plant.length === 0) {
            throw new Error('Plant not found');
        }

        await RedisCacheService.set('plant', `${userId}:${plantId}`, plant[0], 300);
        return plant[0];
    }

    static async updatePlant(userId: number, plantId: number, data: UpdatePlantInput): Promise<PlantResponse> {
        const existing = await this.getPlantById(userId, plantId);
        if (!existing) {
            throw new Error('Plant not found');
        }

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

        await Promise.all([
            RedisCacheService.clearUserPaginatedCache('plants', userId),
            RedisCacheService.delete('plant', `${userId}:${plantId}`),
            RedisCacheService.delete('plants:stats', userId),
        ]);

        return updated as PlantResponse;
    }
    static async updateHealthStatus(userId: number, plantId: number, data: UpdateHealthStatusInput): Promise<PlantResponse> {
        const plant = await prisma.plantTracking.findFirst({
            where: { id: plantId, userId },
            select: { plantName: true, healthStatus: true, growthStage: true }
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

        await socketService.sendPlantUpdate(userId, {
            plantId,
            plantName: plant.plantName,
            status: data.healthStatus,
            healthStatus: data.healthStatus,
            growthStage: data.growthStage,
            timestamp: new Date()
        });

        if (data.healthStatus === 'HARVEST_READY') {
            await socketService.sendPlantReadyForHarvest(userId, plantId, plant.plantName);
        }

        await Promise.all([
            RedisCacheService.clearUserPaginatedCache('plants', userId),
            RedisCacheService.delete('plant', `${userId}:${plantId}`),
            RedisCacheService.delete('plants:stats', userId),
        ]);

        return updated as PlantResponse;
    }

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
        await socketService.sendNotification(userId, 'Plant Harvested', `${plant.plantName} has been harvested successfully!`, 'PLANT_HARVEST');

        await Promise.all([
            RedisCacheService.clearUserPaginatedCache('plants', userId),
            RedisCacheService.delete('plant', `${userId}:${plantId}`),
            RedisCacheService.delete('plants:stats', userId),
        ]);

        return updated as PlantResponse;
    }

    static async deletePlant(userId: number, plantId: number): Promise<{ message: string }> {
        await prisma.plantTracking.delete({ where: { id: plantId } });

        await Promise.all([
            RedisCacheService.clearUserPaginatedCache('plants', userId),
            RedisCacheService.delete('plant', `${userId}:${plantId}`),
            RedisCacheService.delete('plants:stats', userId),
        ]);

        return { message: 'Plant deleted successfully' };
    }

    static async getPlantStats(userId: number): Promise<any> {
        const cached = await RedisCacheService.get('plants:stats', userId);
        if (cached) {
            return cached;
        }

        const stats = await prisma.$queryRaw<any[]>`
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

        const result = stats[0] || {};
        const formattedStats = {
            totalPlants: Number(result.total) || 0,
            healthyPlants: Number(result.healthy) || 0,
            moderatePlants: Number(result.moderate) || 0,
            criticalPlants: Number(result.critical) || 0,
            readyForHarvest: Number(result.harvest_ready) || 0,
            byGrowthStage: {
                seedling: Number(result.seedling) || 0,
                vegetative: Number(result.vegetative) || 0,
                flowering: Number(result.flowering) || 0,
                fruiting: Number(result.fruiting) || 0,
                harvesting: Number(result.harvesting) || 0,
            }
        };

        await RedisCacheService.set('plants:stats', userId, formattedStats, 60);
        return formattedStats;
    }
}