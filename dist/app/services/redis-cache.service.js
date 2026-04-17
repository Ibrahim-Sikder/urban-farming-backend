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
    static getClient() {
        if (!this.client) {
            this.client = redis_1.default.getClient();
        }
        return this.client;
    }
    static async setFast(key, value, ttlSeconds = this.DEFAULT_TTL) {
        const client = this.getClient();
        const serialized = JSON.stringify(value);
        await client.setex(key, ttlSeconds, serialized);
    }
    static async getFast(key) {
        const client = this.getClient();
        const data = await client.get(key);
        if (!data)
            return null;
        try {
            return JSON.parse(data);
        }
        catch {
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
    static async cacheUserPlants(userId, plants) {
        const key = `plants:${userId}`;
        await this.setFast(key, plants, this.DEFAULT_TTL);
    }
    static async getCachedUserPlants(userId) {
        const key = `plants:${userId}`;
        return await this.getFast(key);
    }
    static async clearUserPlantsCache(userId) {
        await this.del(`plants:${userId}`);
        await this.del(`plants:stats:${userId}`);
    }
    static async cachePlantStats(userId, stats) {
        const key = `plants:stats:${userId}`;
        await this.setFast(key, stats, this.SHORT_TTL);
    }
    static async getCachedPlantStats(userId) {
        const key = `plants:stats:${userId}`;
        return await this.getFast(key);
    }
    static async cacheSinglePlant(userId, plantId, plant) {
        const key = `plant:${userId}:${plantId}`;
        await this.setFast(key, plant, this.DEFAULT_TTL);
    }
    static async getCachedSinglePlant(userId, plantId) {
        const key = `plant:${userId}:${plantId}`;
        return await this.getFast(key);
    }
    static async clearSinglePlantCache(userId, plantId) {
        await this.del(`plant:${userId}:${plantId}`);
    }
}
exports.RedisCacheService = RedisCacheService;
exports.default = RedisCacheService;
//# sourceMappingURL=redis-cache.service.js.map