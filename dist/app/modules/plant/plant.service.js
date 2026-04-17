"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlantService = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
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
        await prisma_1.default.notification.create({
            data: {
                userId,
                title: 'New Plant Added',
                message: `${data.plantName} has been added to your garden`,
                type: 'PLANT',
            },
        });
        return plant;
    }
    static async getUserPlants(userId) {
        const plants = await prisma_1.default.plantTracking.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return plants;
    }
    static async getPlantById(userId, plantId) {
        const plant = await prisma_1.default.plantTracking.findFirst({
            where: { id: plantId, userId },
        });
        if (!plant) {
            throw new Error('Plant not found');
        }
        return plant;
    }
    static async updatePlant(userId, plantId, data) {
        const plant = await prisma_1.default.plantTracking.findFirst({
            where: { id: plantId, userId },
        });
        if (!plant) {
            throw new Error('Plant not found');
        }
        const updated = await prisma_1.default.plantTracking.update({
            where: { id: plantId },
            data: {
                plantName: data.plantName,
                plantType: data.plantType,
                expectedHarvestDate: data.expectedHarvestDate,
                healthStatus: data.healthStatus,
                growthStage: data.growthStage,
                notes: data.notes,
            },
        });
        return updated;
    }
    static async updateHealthStatus(userId, plantId, data) {
        const plant = await prisma_1.default.plantTracking.findFirst({
            where: { id: plantId, userId },
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
        let notificationMessage = '';
        if (data.healthStatus === 'CRITICAL') {
            notificationMessage = `Your ${plant.plantName} needs immediate attention!`;
        }
        else if (data.healthStatus === 'HARVEST_READY') {
            notificationMessage = `Your ${plant.plantName} is ready for harvest!`;
        }
        else {
            notificationMessage = `${plant.plantName} health status updated to ${data.healthStatus}`;
        }
        await prisma_1.default.notification.create({
            data: {
                userId,
                title: 'Plant Health Update',
                message: notificationMessage,
                type: 'PLANT',
            },
        });
        return updated;
    }
    static async markAsHarvested(userId, plantId) {
        const plant = await prisma_1.default.plantTracking.findFirst({
            where: { id: plantId, userId },
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
        await prisma_1.default.notification.create({
            data: {
                userId,
                title: 'Plant Harvested',
                message: `Congratulations! Your ${plant.plantName} has been harvested`,
                type: 'PLANT',
            },
        });
        return updated;
    }
    static async deletePlant(userId, plantId) {
        const plant = await prisma_1.default.plantTracking.findFirst({
            where: { id: plantId, userId },
        });
        if (!plant) {
            throw new Error('Plant not found');
        }
        await prisma_1.default.plantTracking.delete({ where: { id: plantId } });
        return { message: 'Plant deleted successfully' };
    }
    static async getPlantStats(userId) {
        const plants = await prisma_1.default.plantTracking.findMany({
            where: { userId },
        });
        const stats = {
            totalPlants: plants.length,
            healthyPlants: plants.filter(p => p.healthStatus === 'HEALTHY').length,
            moderatePlants: plants.filter(p => p.healthStatus === 'MODERATE').length,
            criticalPlants: plants.filter(p => p.healthStatus === 'CRITICAL').length,
            readyForHarvest: plants.filter(p => p.healthStatus === 'HARVEST_READY').length,
            byGrowthStage: {
                seedling: plants.filter(p => p.growthStage === 'SEEDLING').length,
                vegetative: plants.filter(p => p.growthStage === 'VEGETATIVE').length,
                flowering: plants.filter(p => p.growthStage === 'FLOWERING').length,
                fruiting: plants.filter(p => p.growthStage === 'FRUITING').length,
                harvesting: plants.filter(p => p.growthStage === 'HARVESTING').length,
            },
        };
        return stats;
    }
}
exports.PlantService = PlantService;
//# sourceMappingURL=plant.service.js.map