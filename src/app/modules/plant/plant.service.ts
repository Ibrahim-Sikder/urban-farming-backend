// modules/plant/plant.service.ts
import prisma from '../../config/prisma';
import { HealthStatus, GrowthStage } from '@prisma/client';
import {
    CreatePlantInput,
    UpdatePlantInput,
    UpdateHealthStatusInput,
    PlantResponse,
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

        // Create notification
        await prisma.notification.create({
            data: {
                userId,
                title: 'New Plant Added',
                message: `${data.plantName} has been added to your garden`,
                type: 'PLANT',
            },
        });

        return plant as PlantResponse;
    }

    // ============ GET USER PLANTS ============
    static async getUserPlants(userId: number): Promise<PlantResponse[]> {
        const plants = await prisma.plantTracking.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return plants as PlantResponse[];
    }

    static async getPlantById(userId: number, plantId: number): Promise<PlantResponse> {
        const plant = await prisma.plantTracking.findFirst({
            where: { id: plantId, userId },
        });

        if (!plant) {
            throw new Error('Plant not found');
        }

        return plant as PlantResponse;
    }

    // ============ UPDATE PLANT ============
    static async updatePlant(userId: number, plantId: number, data: UpdatePlantInput): Promise<PlantResponse> {
        const plant = await prisma.plantTracking.findFirst({
            where: { id: plantId, userId },
        });

        if (!plant) {
            throw new Error('Plant not found');
        }

        const updated = await prisma.plantTracking.update({
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

        return updated as PlantResponse;
    }

    // ============ UPDATE HEALTH STATUS ============
    static async updateHealthStatus(userId: number, plantId: number, data: UpdateHealthStatusInput): Promise<PlantResponse> {
        const plant = await prisma.plantTracking.findFirst({
            where: { id: plantId, userId },
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

        // Create notification for health status change
        let notificationMessage = '';
        if (data.healthStatus === 'CRITICAL') {
            notificationMessage = `Your ${plant.plantName} needs immediate attention!`;
        } else if (data.healthStatus === 'HARVEST_READY') {
            notificationMessage = `Your ${plant.plantName} is ready for harvest!`;
        } else {
            notificationMessage = `${plant.plantName} health status updated to ${data.healthStatus}`;
        }

        await prisma.notification.create({
            data: {
                userId,
                title: 'Plant Health Update',
                message: notificationMessage,
                type: 'PLANT',
            },
        });

        return updated as PlantResponse;
    }

    // ============ MARK AS HARVESTED ============
    static async markAsHarvested(userId: number, plantId: number): Promise<PlantResponse> {
        const plant = await prisma.plantTracking.findFirst({
            where: { id: plantId, userId },
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

        await prisma.notification.create({
            data: {
                userId,
                title: 'Plant Harvested',
                message: `Congratulations! Your ${plant.plantName} has been harvested`,
                type: 'PLANT',
            },
        });

        return updated as PlantResponse;
    }

    // ============ DELETE PLANT ============
    static async deletePlant(userId: number, plantId: number): Promise<{ message: string }> {
        const plant = await prisma.plantTracking.findFirst({
            where: { id: plantId, userId },
        });

        if (!plant) {
            throw new Error('Plant not found');
        }

        await prisma.plantTracking.delete({ where: { id: plantId } });

        return { message: 'Plant deleted successfully' };
    }

    // ============ GET PLANT STATISTICS ============
    static async getPlantStats(userId: number): Promise<any> {
        const plants = await prisma.plantTracking.findMany({
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