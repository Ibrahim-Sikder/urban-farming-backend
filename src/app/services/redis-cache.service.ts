import Redis from 'ioredis';
import RedisConfig from '../config/redis';

export class RedisCacheService {
    private static client: Redis;
    private static readonly DEFAULT_TTL = 300; // 5 minutes
    private static readonly SHORT_TTL = 60;    // 1 minute

    private static getClient(): Redis {
        if (!this.client) {
            this.client = RedisConfig.getClient();
        }
        return this.client;
    }

    // Ultra-fast set without compression (for small data)
    static async setFast(key: string, value: any, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
        const client = this.getClient();
        const serialized = JSON.stringify(value);
        await client.setex(key, ttlSeconds, serialized);
    }

    // Ultra-fast get without compression
    static async getFast<T>(key: string): Promise<T | null> {
        const client = this.getClient();
        const data = await client.get(key);
        if (!data) return null;

        try {
            return JSON.parse(data) as T;
        } catch {
            return null;
        }
    }

    static async del(key: string): Promise<void> {
        const client = this.getClient();
        await client.del(key);
    }

    static async delPattern(pattern: string): Promise<void> {
        const client = this.getClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(...keys);
        }
    }

    // Plant specific methods
    static async cacheUserPlants(userId: number, plants: any[]): Promise<void> {
        const key = `plants:${userId}`;
        await this.setFast(key, plants, this.DEFAULT_TTL);
    }

    static async getCachedUserPlants(userId: number): Promise<any[] | null> {
        const key = `plants:${userId}`;
        return await this.getFast<any[]>(key);
    }

    static async clearUserPlantsCache(userId: number): Promise<void> {
        await this.del(`plants:${userId}`);
        await this.del(`plants:stats:${userId}`);
    }

    static async cachePlantStats(userId: number, stats: any): Promise<void> {
        const key = `plants:stats:${userId}`;
        await this.setFast(key, stats, this.SHORT_TTL);
    }

    static async getCachedPlantStats(userId: number): Promise<any | null> {
        const key = `plants:stats:${userId}`;
        return await this.getFast<any>(key);
    }

    static async cacheSinglePlant(userId: number, plantId: number, plant: any): Promise<void> {
        const key = `plant:${userId}:${plantId}`;
        await this.setFast(key, plant, this.DEFAULT_TTL);
    }

    static async getCachedSinglePlant(userId: number, plantId: number): Promise<any | null> {
        const key = `plant:${userId}:${plantId}`;
        return await this.getFast<any>(key);
    }

    static async clearSinglePlantCache(userId: number, plantId: number): Promise<void> {
        await this.del(`plant:${userId}:${plantId}`);
    }
}

export default RedisCacheService;