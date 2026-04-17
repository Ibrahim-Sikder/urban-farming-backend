"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
class RedisConfig {
    static client = null;
    static subscriber = null;
    static getClient() {
        if (!this.client) {
            this.client = new ioredis_1.default({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD || undefined,
                db: parseInt(process.env.REDIS_DB || '0'),
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
                lazyConnect: false,
            });
            this.client.on('connect', () => {
                console.log('✅ Redis connected successfully');
            });
            this.client.on('error', (error) => {
                console.error('❌ Redis connection error:', error);
            });
            this.client.on('ready', () => {
                console.log('✅ Redis is ready to use');
            });
        }
        return this.client;
    }
    static getSubscriber() {
        if (!this.subscriber) {
            this.subscriber = new ioredis_1.default({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD || undefined,
                db: parseInt(process.env.REDIS_DB || '1'),
            });
        }
        return this.subscriber;
    }
    static async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
        }
        if (this.subscriber) {
            await this.subscriber.quit();
            this.subscriber = null;
        }
        console.log('Redis disconnected');
    }
    static async healthCheck() {
        try {
            const client = this.getClient();
            await client.ping();
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.default = RedisConfig;
//# sourceMappingURL=redis.js.map