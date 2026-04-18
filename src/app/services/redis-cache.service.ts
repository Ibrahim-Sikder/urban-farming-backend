import Redis from 'ioredis';
import RedisConfig from '../config/redis';

export class RedisCacheService {
    private static client: Redis;
    private static readonly DEFAULT_TTL = 300;
    private static readonly SHORT_TTL = 60;
    private static readonly LONG_TTL = 3600;
    private static cacheHits = 0;
    private static cacheMisses = 0;

    private static getClient(): Redis {
        if (!this.client) {
            this.client = RedisConfig.getClient();
        }
        return this.client;
    }

    static async setFast(key: string, value: any, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
        const client = this.getClient();
        try {
            const serialized = JSON.stringify(value);
            const pipeline = client.pipeline();
            pipeline.setex(key, ttlSeconds, serialized);
            await pipeline.exec();
        } catch (error) {
            console.error(`Redis set error for key ${key}:`, error);
        }
    }

    static async getFast<T>(key: string): Promise<T | null> {
        const client = this.getClient();
        try {
            const startTime = Date.now();
            const data = await client.get(key);
            const duration = Date.now() - startTime;

            if (!data) {
                this.cacheMisses++;
                if (duration > 10) console.log(`⚠️ Cache MISS (${duration}ms): ${key}`);
                return null;
            }

            this.cacheHits++;
            if (duration > 5) console.log(`⚠️ Slow cache GET (${duration}ms): ${key}`);

            return JSON.parse(data) as T;
        } catch (error) {
            console.error(`Redis get error for key ${key}:`, error);
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

    static async exists(key: string): Promise<boolean> {
        const client = this.getClient();
        const result = await client.exists(key);
        return result === 1;
    }


    static async set<T>(prefix: string, identifier: string | number, data: T, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
        await this.setFast(`${prefix}:${identifier}`, data, ttlSeconds);
    }

    static async get<T>(prefix: string, identifier: string | number): Promise<T | null> {
        return await this.getFast<T>(`${prefix}:${identifier}`);
    }

    static async delete(prefix: string, identifier: string | number): Promise<void> {
        await this.del(`${prefix}:${identifier}`);
    }

    static async setPaginated<T>(prefix: string, userId: number | null, queryParams: Record<string, any>, data: T, ttlSeconds: number = this.SHORT_TTL): Promise<void> {
        const key = this.buildPaginatedKey(prefix, userId, queryParams);
        await this.setFast(key, data, ttlSeconds);
    }

    static async getPaginated<T>(prefix: string, userId: number | null, queryParams: Record<string, any>): Promise<T | null> {
        const key = this.buildPaginatedKey(prefix, userId, queryParams);
        return await this.getFast<T>(key);
    }

    static async clearUserPaginatedCache(prefix: string, userId: number): Promise<void> {
        await this.delPattern(`${prefix}:user:${userId}:*`);
    }

    private static buildPaginatedKey(prefix: string, userId: number | null, queryParams: Record<string, any>): string {
        const sortedParams: Record<string, any> = {};
        Object.keys(queryParams).sort().forEach(key => {
            if (queryParams[key] !== undefined && queryParams[key] !== null && queryParams[key] !== '') {
                sortedParams[key] = queryParams[key];
            }
        });

        if (userId) {
            return `${prefix}:user:${userId}:${JSON.stringify(sortedParams)}`;
        }
        return `${prefix}:${JSON.stringify(sortedParams)}`;
    }

    static getStats() {
        const total = this.cacheHits + this.cacheMisses;
        return {
            hits: this.cacheHits,
            misses: this.cacheMisses,
            hitRate: total > 0 ? ((this.cacheHits / total) * 100).toFixed(2) + '%' : '0%',
            totalRequests: total
        };
    }

    static resetStats() {
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    static async cacheUserPlants(userId: number, plants: any[]): Promise<void> {
        await this.set('plants', userId, plants, this.DEFAULT_TTL);
    }

    static async getCachedUserPlants(userId: number): Promise<any[] | null> {
        return await this.get<any[]>('plants', userId);
    }

    static async clearUserPlantsCache(userId: number): Promise<void> {
        await this.delete('plants', userId);
        await this.delete('plants:stats', userId);
    }

    static async cachePlantStats(userId: number, stats: any): Promise<void> {
        await this.set('plants:stats', userId, stats, this.SHORT_TTL);
    }

    static async getCachedPlantStats(userId: number): Promise<any | null> {
        return await this.get<any>('plants:stats', userId);
    }

    static async cacheSinglePlant(userId: number, plantId: number, plant: any): Promise<void> {
        await this.set('plant', `${userId}:${plantId}`, plant, this.DEFAULT_TTL);
    }

    static async getCachedSinglePlant(userId: number, plantId: number): Promise<any | null> {
        return await this.get<any>('plant', `${userId}:${plantId}`);
    }

    static async clearSinglePlantCache(userId: number, plantId: number): Promise<void> {
        await this.delete('plant', `${userId}:${plantId}`);
    }
}

export default RedisCacheService;