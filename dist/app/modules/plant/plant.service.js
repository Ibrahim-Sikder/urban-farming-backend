"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlantService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
const prisma_query_builder_1 = require("../../shared/utils/prisma-query-builder");
class PlantService {
    static async createPlant(userId, data) {
        const plant = await prisma_1.default.plantTracking.create({
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
        setImmediate(() => {
            redis_cache_service_1.default.clearUserPlantsCache(userId).catch(console.error);
        });
        return plant;
    }
    static async getUserPlants(userId, queryParams) {
        const cacheKey = `plants:${userId}:${JSON.stringify(queryParams)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('PlantTracking', queryParams);
        queryBuilder.setSearchFields(['plantName', 'plantType', 'notes']);
        const userCondition = client_1.Prisma.sql `"userId" = ${userId}`;
        queryBuilder.addCustomCondition(userCondition);
        const customQuery = client_1.Prisma.sql `
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
        const result = await queryBuilder.execute(customQuery);
        await redis_cache_service_1.default.setFast(cacheKey, result, 120);
        return result;
    }
    static async getAllPlants(queryParams) {
        const cacheKey = `plants:all:${JSON.stringify(queryParams)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('PlantTracking', queryParams);
        queryBuilder.setSearchFields(['plantName', 'plantType', 'notes']);
        const customQuery = client_1.Prisma.sql `
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
        const result = await queryBuilder.execute(customQuery);
        await redis_cache_service_1.default.setFast(cacheKey, result, 120);
        return result;
    }
    static async getPlantById(userId, plantId) {
        const cached = await redis_cache_service_1.default.getCachedSinglePlant(userId, plantId);
        if (cached) {
            return cached;
        }
        const plant = await prisma_1.default.$queryRaw `
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
        await redis_cache_service_1.default.cacheSinglePlant(userId, plantId, plant[0]);
        return plant[0];
    }
    static async updatePlant(userId, plantId, data) {
        const existing = await this.getPlantById(userId, plantId);
        if (!existing) {
            throw new Error('Plant not found');
        }
        const updateData = {};
        if (data.plantName !== undefined)
            updateData.plantName = data.plantName;
        if (data.plantType !== undefined)
            updateData.plantType = data.plantType;
        if (data.expectedHarvestDate !== undefined)
            updateData.expectedHarvestDate = data.expectedHarvestDate;
        if (data.healthStatus !== undefined)
            updateData.healthStatus = data.healthStatus;
        if (data.growthStage !== undefined)
            updateData.growthStage = data.growthStage;
        if (data.notes !== undefined)
            updateData.notes = data.notes;
        const updated = await prisma_1.default.plantTracking.update({
            where: { id: plantId },
            data: updateData,
        });
        await Promise.all([
            redis_cache_service_1.default.delPattern(`plants:${userId}:*`),
            redis_cache_service_1.default.clearSinglePlantCache(userId, plantId),
            redis_cache_service_1.default.del(`plants:stats:${userId}`),
        ]);
        return updated;
    }
    static async updateHealthStatus(userId, plantId, data) {
        const updated = await prisma_1.default.plantTracking.update({
            where: { id: plantId },
            data: {
                healthStatus: data.healthStatus,
                growthStage: data.growthStage,
                notes: data.notes,
            },
        });
        await Promise.all([
            redis_cache_service_1.default.delPattern(`plants:${userId}:*`),
            redis_cache_service_1.default.clearSinglePlantCache(userId, plantId),
            redis_cache_service_1.default.del(`plants:stats:${userId}`),
        ]);
        return updated;
    }
    static async markAsHarvested(userId, plantId) {
        const updated = await prisma_1.default.plantTracking.update({
            where: { id: plantId },
            data: {
                actualHarvestDate: new Date(),
                healthStatus: 'HARVEST_READY',
                growthStage: 'HARVESTING',
            },
        });
        await Promise.all([
            redis_cache_service_1.default.delPattern(`plants:${userId}:*`),
            redis_cache_service_1.default.clearSinglePlantCache(userId, plantId),
            redis_cache_service_1.default.del(`plants:stats:${userId}`),
        ]);
        return updated;
    }
    static async deletePlant(userId, plantId) {
        await prisma_1.default.plantTracking.delete({
            where: { id: plantId },
        });
        await Promise.all([
            redis_cache_service_1.default.delPattern(`plants:${userId}:*`),
            redis_cache_service_1.default.clearSinglePlantCache(userId, plantId),
            redis_cache_service_1.default.del(`plants:stats:${userId}`),
        ]);
        return { message: 'Plant deleted successfully' };
    }
    static async getPlantStats(userId) {
        const cached = await redis_cache_service_1.default.getCachedPlantStats(userId);
        if (cached) {
            return cached;
        }
        const stats = await prisma_1.default.$queryRaw `
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
        await redis_cache_service_1.default.cachePlantStats(userId, formattedStats);
        return formattedStats;
    }
}
exports.PlantService = PlantService;
//# sourceMappingURL=plant.service.js.map