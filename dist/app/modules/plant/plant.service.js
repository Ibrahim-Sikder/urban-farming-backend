"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlantService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
const socket_service_1 = __importDefault(require("../../services/socket.service"));
const prisma_query_builder_1 = require("../../shared/utils/prisma-query-builder");
class PlantService {
    static async createPlant(userId, data) {
        const startTime = Date.now();
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
        setImmediate(() => {
            redis_cache_service_1.default.clearUserPaginatedCache('plants', userId).catch(console.error);
            redis_cache_service_1.default.delete('plants:stats', userId).catch(console.error);
        });
        const duration = Date.now() - startTime;
        console.log(`✅ Plant created in ${duration}ms`);
        return plant;
    }
    static async getUserPlants(userId, queryParams) {
        const startTime = Date.now();
        const cached = await redis_cache_service_1.default.getPaginated('plants', userId, queryParams);
        if (cached) {
            const duration = Date.now() - startTime;
            console.log(`✅ Cache HIT - ${duration}ms for user ${userId}`);
            return cached;
        }
        console.log(`📊 Cache MISS - Querying DB for user ${userId}`);
        const queryStart = Date.now();
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('PlantTracking', queryParams);
        queryBuilder.setSearchFields(['plantName', 'plantType', 'notes']);
        queryBuilder.addCustomCondition(client_1.Prisma.sql `"userId" = ${userId}`);
        const customQuery = client_1.Prisma.sql `
            SELECT 
                id, "plantName", "plantType", "plantedDate",
                "expectedHarvestDate", "actualHarvestDate", "healthStatus",
                "growthStage", notes, "lastUpdated", "createdAt"
            FROM "PlantTracking"
        `;
        const result = await queryBuilder.execute(customQuery);
        const queryTime = Date.now() - queryStart;
        console.log(`📊 DB Query: ${queryTime}ms for ${result.data.length} plants`);
        setImmediate(() => {
            redis_cache_service_1.default.setPaginated('plants', userId, queryParams, result, 120).catch(console.error);
        });
        const totalTime = Date.now() - startTime;
        console.log(`📊 Total response: ${totalTime}ms (DB: ${queryTime}ms)`);
        return result;
    }
    static async getAllPlants(queryParams) {
        const startTime = Date.now();
        const cached = await redis_cache_service_1.default.getPaginated('plants:all', null, queryParams);
        if (cached) {
            const duration = Date.now() - startTime;
            console.log(`✅ Admin cache HIT - ${duration}ms`);
            return cached;
        }
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('PlantTracking', queryParams);
        queryBuilder.setSearchFields(['plantName', 'plantType', 'notes']);
        const customQuery = client_1.Prisma.sql `
            SELECT 
                p.id, p."plantName", p."plantType", p."plantedDate",
                p."expectedHarvestDate", p."actualHarvestDate", p."healthStatus",
                p."growthStage", p.notes, p."lastUpdated", p."createdAt",
                u.name as "userName", u.email as "userEmail"
            FROM "PlantTracking" p
            LEFT JOIN "User" u ON p."userId" = u.id
        `;
        const result = await queryBuilder.execute(customQuery);
        setImmediate(() => {
            redis_cache_service_1.default.setPaginated('plants:all', null, queryParams, result, 120).catch(console.error);
        });
        return result;
    }
    static async getPlantById(userId, plantId) {
        const startTime = Date.now();
        const cached = await redis_cache_service_1.default.get('plant', `${userId}:${plantId}`);
        if (cached) {
            const duration = Date.now() - startTime;
            console.log(`✅ Plant cache HIT - ${duration}ms`);
            return cached;
        }
        const plant = await prisma_1.default.plantTracking.findFirst({
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
            redis_cache_service_1.default.set('plant', `${userId}:${plantId}`, plant, 300).catch(console.error);
        });
        const duration = Date.now() - startTime;
        console.log(`📊 Plant DB query: ${duration}ms`);
        return plant;
    }
    static async updatePlant(userId, plantId, data) {
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
            redis_cache_service_1.default.clearUserPaginatedCache('plants', userId),
            redis_cache_service_1.default.delete('plant', `${userId}:${plantId}`),
            redis_cache_service_1.default.delete('plants:stats', userId),
        ]);
        return updated;
    }
    static async updateHealthStatus(userId, plantId, data) {
        const plant = await prisma_1.default.plantTracking.findFirst({
            where: { id: plantId, userId },
            select: { plantName: true }
        });
        if (!plant) {
            throw new Error('Plant not found');
        }
        const updated = await prisma_1.default.plantTracking.update({
            where: { id: plantId },
            data: {
                healthStatus: data.healthStatus,
                growthStage: data.growthStage,
                notes: data.notes,
            },
        });
        socket_service_1.default.sendPlantUpdate(userId, {
            plantId, plantName: plant.plantName, status: data.healthStatus,
            healthStatus: data.healthStatus, growthStage: data.growthStage, timestamp: new Date()
        }).catch(console.error);
        if (data.healthStatus === 'HARVEST_READY') {
            socket_service_1.default.sendPlantReadyForHarvest(userId, plantId, plant.plantName).catch(console.error);
        }
        await Promise.all([
            redis_cache_service_1.default.clearUserPaginatedCache('plants', userId),
            redis_cache_service_1.default.delete('plant', `${userId}:${plantId}`),
            redis_cache_service_1.default.delete('plants:stats', userId),
        ]);
        return updated;
    }
    static async markAsHarvested(userId, plantId) {
        const plant = await prisma_1.default.plantTracking.findFirst({
            where: { id: plantId, userId },
            select: { plantName: true }
        });
        if (!plant) {
            throw new Error('Plant not found');
        }
        const updated = await prisma_1.default.plantTracking.update({
            where: { id: plantId },
            data: {
                actualHarvestDate: new Date(),
                healthStatus: 'HARVEST_READY',
                growthStage: 'HARVESTING',
            },
        });
        socket_service_1.default.sendNotification(userId, 'Plant Harvested', `${plant.plantName} has been harvested successfully!`, 'PLANT_HARVEST').catch(console.error);
        await Promise.all([
            redis_cache_service_1.default.clearUserPaginatedCache('plants', userId),
            redis_cache_service_1.default.delete('plant', `${userId}:${plantId}`),
            redis_cache_service_1.default.delete('plants:stats', userId),
        ]);
        return updated;
    }
    static async deletePlant(userId, plantId) {
        await prisma_1.default.plantTracking.delete({ where: { id: plantId } });
        await Promise.all([
            redis_cache_service_1.default.clearUserPaginatedCache('plants', userId),
            redis_cache_service_1.default.delete('plant', `${userId}:${plantId}`),
            redis_cache_service_1.default.delete('plants:stats', userId),
        ]);
        return { message: 'Plant deleted successfully' };
    }
    static async getPlantStats(userId) {
        const startTime = Date.now();
        const cached = await redis_cache_service_1.default.get('plants:stats', userId);
        if (cached) {
            const duration = Date.now() - startTime;
            console.log(`✅ Stats cache HIT - ${duration}ms`);
            return cached;
        }
        const stats = await prisma_1.default.plantTracking.groupBy({
            by: ['healthStatus', 'growthStage'],
            where: { userId },
            _count: true,
        });
        let totalPlants = 0;
        let healthy = 0, moderate = 0, critical = 0, harvestReady = 0;
        let seedling = 0, vegetative = 0, flowering = 0, fruiting = 0, harvesting = 0;
        for (const stat of stats) {
            const count = stat._count;
            totalPlants += count;
            switch (stat.healthStatus) {
                case 'HEALTHY':
                    healthy = count;
                    break;
                case 'MODERATE':
                    moderate = count;
                    break;
                case 'CRITICAL':
                    critical = count;
                    break;
                case 'HARVEST_READY':
                    harvestReady = count;
                    break;
            }
            switch (stat.growthStage) {
                case 'SEEDLING':
                    seedling = count;
                    break;
                case 'VEGETATIVE':
                    vegetative = count;
                    break;
                case 'FLOWERING':
                    flowering = count;
                    break;
                case 'FRUITING':
                    fruiting = count;
                    break;
                case 'HARVESTING':
                    harvesting = count;
                    break;
            }
        }
        const formattedStats = {
            totalPlants, healthyPlants: healthy, moderatePlants: moderate,
            criticalPlants: critical, readyForHarvest: harvestReady,
            byGrowthStage: { seedling, vegetative, flowering, fruiting, harvesting }
        };
        await redis_cache_service_1.default.set('plants:stats', userId, formattedStats, 60);
        const duration = Date.now() - startTime;
        console.log(`📊 Stats computed in ${duration}ms`);
        return formattedStats;
    }
}
exports.PlantService = PlantService;
//# sourceMappingURL=plant.service.js.map