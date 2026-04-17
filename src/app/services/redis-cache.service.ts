import Redis from 'ioredis';
import RedisConfig from '../config/redis';

export class RedisCacheService {
    private static client: Redis;
    private static readonly DEFAULT_TTL = 300; // 5 minutes
    private static readonly SHORT_TTL = 60;    // 1 minute
    private static readonly LONG_TTL = 3600;   // 1 hour

    private static getClient(): Redis {
        if (!this.client) {
            this.client = RedisConfig.getClient();
        }
        return this.client;
    }

    // ============ GENERIC CACHE METHODS ============

    /**
     * Generic method to cache any data
     * @param prefix - Cache prefix (e.g., 'user', 'product', 'order')
     * @param identifier - Unique identifier (e.g., userId, productId)
     * @param data - Data to cache
     * @param ttlSeconds - Time to live in seconds (default: 300)
     */
    static async set<T>(
        prefix: string,
        identifier: string | number,
        data: T,
        ttlSeconds: number = this.DEFAULT_TTL
    ): Promise<void> {
        const key = `${prefix}:${identifier}`;
        await this.setFast(key, data, ttlSeconds);
    }

    /**
     * Generic method to get cached data
     * @param prefix - Cache prefix
     * @param identifier - Unique identifier
     * @returns Cached data or null
     */
    static async get<T>(prefix: string, identifier: string | number): Promise<T | null> {
        const key = `${prefix}:${identifier}`;
        return await this.getFast<T>(key);
    }

    /**
     * Generic method to delete cached data
     * @param prefix - Cache prefix
     * @param identifier - Unique identifier
     */
    static async delete(prefix: string, identifier: string | number): Promise<void> {
        const key = `${prefix}:${identifier}`;
        await this.del(key);
    }

    /**
     * Generic method to delete all cache with a pattern
     * @param pattern - Pattern to match (e.g., 'user:*', 'product:*')
     */
    static async deletePattern(pattern: string): Promise<void> {
        await this.delPattern(pattern);
    }

    /**
     * Generic method for paginated data caching
     * @param prefix - Cache prefix
     * @param userId - User ID (if applicable)
     * @param queryParams - Query parameters
     * @param data - Data to cache
     * @param ttlSeconds - Time to live
     */
    static async setPaginated<T>(
        prefix: string,
        userId: number | null,
        queryParams: Record<string, any>,
        data: T,
        ttlSeconds: number = this.SHORT_TTL
    ): Promise<void> {
        const key = this.buildPaginatedKey(prefix, userId, queryParams);
        await this.setFast(key, data, ttlSeconds);
    }

    /**
     * Generic method to get paginated data
     * @param prefix - Cache prefix
     * @param userId - User ID (if applicable)
     * @param queryParams - Query parameters
     */
    static async getPaginated<T>(
        prefix: string,
        userId: number | null,
        queryParams: Record<string, any>
    ): Promise<T | null> {
        const key = this.buildPaginatedKey(prefix, userId, queryParams);
        return await this.getFast<T>(key);
    }

    /**
     * Generic method to clear all paginated cache for a user
     * @param prefix - Cache prefix
     * @param userId - User ID
     */
    static async clearUserPaginatedCache(prefix: string, userId: number): Promise<void> {
        await this.deletePattern(`${prefix}:user:${userId}:*`);
    }

    // ============ GENERIC BATCH OPERATIONS ============

    /**
     * Get multiple cache keys at once
     * @param keys - Array of cache keys
     */
    static async getBatch<T>(keys: string[]): Promise<Map<string, T>> {
        const client = this.getClient();
        const values = await client.mget(keys);
        const result = new Map<string, T>();

        for (let i = 0; i < keys.length; i++) {
            if (values[i]) {
                try {
                    result.set(keys[i], JSON.parse(values[i]!));
                } catch {
                    // Skip invalid JSON
                }
            }
        }
        return result;
    }

    /**
     * Set multiple cache keys at once
     * @param entries - Array of [key, value] pairs
     * @param ttlSeconds - Time to live
     */
    static async setBatch(entries: Array<[string, any]>, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
        const client = this.getClient();
        const pipeline = client.pipeline();

        for (const [key, value] of entries) {
            const serialized = JSON.stringify(value);
            pipeline.setex(key, ttlSeconds, serialized);
        }

        await pipeline.exec();
    }

    // ============ HELPER METHODS ============

    private static buildPaginatedKey(
        prefix: string,
        userId: number | null,
        queryParams: Record<string, any>
    ): string {
        const sortedParams = this.sortQueryParams(queryParams);
        if (userId) {
            return `${prefix}:user:${userId}:${JSON.stringify(sortedParams)}`;
        }
        return `${prefix}:${JSON.stringify(sortedParams)}`;
    }

    private static sortQueryParams(params: Record<string, any>): Record<string, any> {
        const sorted: Record<string, any> = {};
        Object.keys(params)
            .sort()
            .forEach(key => {
                if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                    sorted[key] = params[key];
                }
            });
        return sorted;
    }

    // ============ ULTRA-FAST METHODS (No compression) ============

    static async setFast(key: string, value: any, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
        const client = this.getClient();
        const serialized = JSON.stringify(value);
        await client.setex(key, ttlSeconds, serialized);
    }

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

    static async exists(key: string): Promise<boolean> {
        const client = this.getClient();
        const result = await client.exists(key);
        return result === 1;
    }

    static async increment(key: string, value: number = 1): Promise<number> {
        const client = this.getClient();
        return await client.incrby(key, value);
    }

    static async expire(key: string, ttlSeconds: number): Promise<void> {
        const client = this.getClient();
        await client.expire(key, ttlSeconds);
    }

    // ============ LEGACY METHODS (For backward compatibility) ============

    // Plant specific (legacy)
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