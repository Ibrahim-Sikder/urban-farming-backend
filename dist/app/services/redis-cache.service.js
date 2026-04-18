"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheService = void 0;
const redis_1 = __importDefault(require("../config/redis"));
class RedisCacheService {
    static client;
    static DEFAULT_TTL = 300;
    static SHORT_TTL = 60;
    static LONG_TTL = 3600;
    static cacheHits = 0;
    static cacheMisses = 0;
    static getClient() {
        if (!this.client) {
            this.client = redis_1.default.getClient();
        }
        return this.client;
    }
    static async setFast(key, value, ttlSeconds = this.DEFAULT_TTL) {
        const client = this.getClient();
        try {
            const serialized = JSON.stringify(value);
            const pipeline = client.pipeline();
            pipeline.setex(key, ttlSeconds, serialized);
            await pipeline.exec();
        }
        catch (error) {
            console.error(`Redis set error for key ${key}:`, error);
        }
    }
    static async getFast(key) {
        const client = this.getClient();
        try {
            const startTime = Date.now();
            const data = await client.get(key);
            const duration = Date.now() - startTime;
            if (!data) {
                this.cacheMisses++;
                if (duration > 10)
                    console.log(`⚠️ Cache MISS (${duration}ms): ${key}`);
                return null;
            }
            this.cacheHits++;
            if (duration > 5)
                console.log(`⚠️ Slow cache GET (${duration}ms): ${key}`);
            return JSON.parse(data);
        }
        catch (error) {
            console.error(`Redis get error for key ${key}:`, error);
            return null;
        }
    }
    static async del(key) {
        const client = this.getClient();
        await client.del(key);
    }
    static async delPattern(pattern) {
        const client = this.getClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(...keys);
        }
    }
    static async exists(key) {
        const client = this.getClient();
        const result = await client.exists(key);
        return result === 1;
    }
    static async set(prefix, identifier, data, ttlSeconds = this.DEFAULT_TTL) {
        await this.setFast(`${prefix}:${identifier}`, data, ttlSeconds);
    }
    static async get(prefix, identifier) {
        return await this.getFast(`${prefix}:${identifier}`);
    }
    static async delete(prefix, identifier) {
        await this.del(`${prefix}:${identifier}`);
    }
    static async setPaginated(prefix, userId, queryParams, data, ttlSeconds = this.SHORT_TTL) {
        const key = this.buildPaginatedKey(prefix, userId, queryParams);
        await this.setFast(key, data, ttlSeconds);
    }
    static async getPaginated(prefix, userId, queryParams) {
        const key = this.buildPaginatedKey(prefix, userId, queryParams);
        return await this.getFast(key);
    }
    static async clearUserPaginatedCache(prefix, userId) {
        await this.delPattern(`${prefix}:user:${userId}:*`);
    }
    static buildPaginatedKey(prefix, userId, queryParams) {
        const sortedParams = {};
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
    static async cacheUserPlants(userId, plants) {
        await this.set('plants', userId, plants, this.DEFAULT_TTL);
    }
    static async getCachedUserPlants(userId) {
        return await this.get('plants', userId);
    }
    static async clearUserPlantsCache(userId) {
        await this.delete('plants', userId);
        await this.delete('plants:stats', userId);
    }
    static async cachePlantStats(userId, stats) {
        await this.set('plants:stats', userId, stats, this.SHORT_TTL);
    }
    static async getCachedPlantStats(userId) {
        return await this.get('plants:stats', userId);
    }
    static async cacheSinglePlant(userId, plantId, plant) {
        await this.set('plant', `${userId}:${plantId}`, plant, this.DEFAULT_TTL);
    }
    static async getCachedSinglePlant(userId, plantId) {
        return await this.get('plant', `${userId}:${plantId}`);
    }
    static async clearSinglePlantCache(userId, plantId) {
        await this.delete('plant', `${userId}:${plantId}`);
    }
}
exports.RedisCacheService = RedisCacheService;
exports.default = RedisCacheService;
//# sourceMappingURL=redis-cache.service.js.map