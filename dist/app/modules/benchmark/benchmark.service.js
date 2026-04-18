"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenchmarkService = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
const bcrypt = __importStar(require("bcryptjs"));
class BenchmarkService {
    static benchmarkResults = new Map();
    static testUserId = null;
    static testVendorId = null;
    static testPlantIds = [];
    static testProductIds = [];
    static testPostIds = [];
    static async setupTestData() {
        if (!this.testUserId) {
            const testUser = await prisma_1.default.user.create({
                data: {
                    name: 'Benchmark User',
                    email: `benchmark_${Date.now()}@test.com`,
                    password: await bcrypt.hash('password123', 10),
                    role: 'CUSTOMER',
                    status: 'ACTIVE',
                },
            });
            this.testUserId = testUser.id;
            const testVendor = await prisma_1.default.user.create({
                data: {
                    name: 'Benchmark Vendor',
                    email: `vendor_benchmark_${Date.now()}@test.com`,
                    password: await bcrypt.hash('password123', 10),
                    role: 'VENDOR',
                    status: 'ACTIVE',
                },
            });
            const vendorProfile = await prisma_1.default.vendorProfile.create({
                data: {
                    userId: testVendor.id,
                    farmName: 'Benchmark Farm',
                    farmLocation: 'Test Location',
                    certificationStatus: 'APPROVED',
                },
            });
            this.testVendorId = vendorProfile.id;
            const products = [];
            for (let i = 0; i < 50; i++) {
                const product = await prisma_1.default.produce.create({
                    data: {
                        vendorId: this.testVendorId,
                        name: `Benchmark Product ${i}`,
                        description: `Test product ${i}`,
                        price: 100 + i,
                        category: 'Vegetables',
                        certificationStatus: 'APPROVED',
                        availableQuantity: 100,
                    },
                });
                products.push(product.id);
            }
            this.testProductIds = products;
        }
        return { userId: this.testUserId, vendorId: this.testVendorId };
    }
    static async benchmarkCreatePlant(iterations = 100) {
        await this.setupTestData();
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            try {
                const plant = await prisma_1.default.plantTracking.create({
                    data: {
                        userId: this.testUserId,
                        plantName: `Benchmark Plant ${i}`,
                        plantType: 'Tomato',
                        plantedDate: new Date(),
                        expectedHarvestDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        healthStatus: 'HEALTHY',
                        growthStage: 'SEEDLING',
                        notes: `Benchmark test plant ${i}`,
                    },
                });
                this.testPlantIds.push(plant.id);
                times.push(Date.now() - start);
            }
            catch (error) {
                times.push(Date.now() - start);
            }
        }
        const result = this.calculateMetrics('CREATE_PLANT', iterations, times);
        await redis_cache_service_1.default.delPattern(`plants:${this.testUserId}:*`);
        return result;
    }
    static async benchmarkReadPlants(iterations = 100) {
        await this.setupTestData();
        const times = [];
        if (this.testPlantIds.length === 0) {
            await this.benchmarkCreatePlant(10);
        }
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            try {
                await prisma_1.default.plantTracking.findMany({
                    where: { userId: this.testUserId },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        plantName: true,
                        plantType: true,
                        healthStatus: true,
                        growthStage: true,
                        createdAt: true,
                    }
                });
                times.push(Date.now() - start);
            }
            catch (error) {
                times.push(Date.now() - start);
            }
        }
        return this.calculateMetrics('READ_PLANTS', iterations, times);
    }
    static async benchmarkUpdatePlant(iterations = 100) {
        await this.setupTestData();
        const times = [];
        if (this.testPlantIds.length === 0) {
            await this.benchmarkCreatePlant(10);
        }
        for (let i = 0; i < iterations; i++) {
            const plantId = this.testPlantIds[i % this.testPlantIds.length];
            const start = Date.now();
            try {
                await prisma_1.default.plantTracking.update({
                    where: { id: plantId },
                    data: {
                        healthStatus: i % 2 === 0 ? 'MODERATE' : 'HEALTHY',
                        growthStage: i % 3 === 0 ? 'VEGETATIVE' : 'FLOWERING',
                        notes: `Updated at iteration ${i}`,
                    },
                });
                times.push(Date.now() - start);
            }
            catch (error) {
                times.push(Date.now() - start);
            }
        }
        await redis_cache_service_1.default.delPattern(`plants:${this.testUserId}:*`);
        return this.calculateMetrics('UPDATE_PLANT', iterations, times);
    }
    static async benchmarkDeletePlant(iterations = 100) {
        await this.setupTestData();
        const times = [];
        const tempPlantIds = [];
        for (let i = 0; i < iterations; i++) {
            const plant = await prisma_1.default.plantTracking.create({
                data: {
                    userId: this.testUserId,
                    plantName: `Temp Delete Plant ${i}`,
                    plantType: 'Test',
                    plantedDate: new Date(),
                    expectedHarvestDate: new Date(),
                    healthStatus: 'HEALTHY',
                    growthStage: 'SEEDLING',
                },
            });
            tempPlantIds.push(plant.id);
        }
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            try {
                await prisma_1.default.plantTracking.delete({
                    where: { id: tempPlantIds[i] },
                });
                times.push(Date.now() - start);
            }
            catch (error) {
                times.push(Date.now() - start);
            }
        }
        return this.calculateMetrics('DELETE_PLANT', iterations, times);
    }
    static async benchmarkCreateOrder(iterations = 100) {
        await this.setupTestData();
        const times = [];
        if (this.testProductIds.length === 0) {
            throw new Error('No test products available');
        }
        for (let i = 0; i < iterations; i++) {
            const productId = this.testProductIds[i % this.testProductIds.length];
            const start = Date.now();
            try {
                const product = await prisma_1.default.produce.findUnique({
                    where: { id: productId },
                    select: { price: true, availableQuantity: true }
                });
                if (product && product.availableQuantity >= 1) {
                    await prisma_1.default.order.create({
                        data: {
                            userId: this.testUserId,
                            produceId: productId,
                            vendorId: this.testVendorId,
                            quantity: 1,
                            totalPrice: product.price,
                            status: 'PENDING',
                        },
                    });
                }
                times.push(Date.now() - start);
            }
            catch (error) {
                times.push(Date.now() - start);
            }
        }
        await redis_cache_service_1.default.delPattern(`marketplace:orders:${this.testUserId}:*`);
        return this.calculateMetrics('CREATE_ORDER', iterations, times);
    }
    static async benchmarkGetProducts(iterations = 100) {
        await this.setupTestData();
        const times = [];
        const pageSizes = [10, 20, 50];
        for (let i = 0; i < iterations; i++) {
            const pageSize = pageSizes[i % pageSizes.length];
            const start = Date.now();
            try {
                await prisma_1.default.produce.findMany({
                    where: { certificationStatus: 'APPROVED', availableQuantity: { gt: 0 } },
                    take: pageSize,
                    skip: (i % 10) * pageSize,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        category: true,
                        availableQuantity: true,
                        vendor: {
                            select: {
                                farmName: true,
                                user: { select: { name: true } }
                            }
                        }
                    }
                });
                times.push(Date.now() - start);
            }
            catch (error) {
                times.push(Date.now() - start);
            }
        }
        return this.calculateMetrics('GET_PRODUCTS', iterations, times);
    }
    static async benchmarkCreatePost(iterations = 100) {
        await this.setupTestData();
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            try {
                const post = await prisma_1.default.communityPost.create({
                    data: {
                        userId: this.testUserId,
                        postContent: `This is benchmark post number ${i}. Testing performance of community forum module.`,
                    },
                });
                this.testPostIds.push(post.id);
                times.push(Date.now() - start);
            }
            catch (error) {
                times.push(Date.now() - start);
            }
        }
        await redis_cache_service_1.default.delPattern('community:posts:*');
        return this.calculateMetrics('CREATE_POST', iterations, times);
    }
    static async benchmarkConcurrentOperations(concurrentUsers = 50, operationsPerUser = 20) {
        await this.setupTestData();
        const startTime = Date.now();
        let successfulOps = 0;
        let failedOps = 0;
        const responseTimes = [];
        const promises = [];
        for (let user = 0; user < concurrentUsers; user++) {
            const promise = (async () => {
                for (let op = 0; op < operationsPerUser; op++) {
                    const opStart = Date.now();
                    try {
                        await prisma_1.default.plantTracking.create({
                            data: {
                                userId: this.testUserId,
                                plantName: `Concurrent Plant U${user} O${op}`,
                                plantType: 'Concurrent Test',
                                plantedDate: new Date(),
                                expectedHarvestDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                                healthStatus: 'HEALTHY',
                                growthStage: 'SEEDLING',
                            },
                        });
                        successfulOps++;
                        responseTimes.push(Date.now() - opStart);
                    }
                    catch (error) {
                        failedOps++;
                        responseTimes.push(Date.now() - opStart);
                    }
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            })();
            promises.push(promise);
        }
        await Promise.all(promises);
        const totalTimeMs = Date.now() - startTime;
        const totalOps = successfulOps + failedOps;
        const sortedTimes = [...responseTimes].sort((a, b) => a - b);
        const p95Index = Math.floor(sortedTimes.length * 0.95);
        const p99Index = Math.floor(sortedTimes.length * 0.99);
        const averageResponseTimeMs = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;
        await redis_cache_service_1.default.delPattern(`plants:${this.testUserId}:*`);
        return {
            operation: 'CONCURRENT_OPERATIONS',
            concurrentUsers,
            operationsPerUser,
            totalOperations: totalOps,
            totalTimeMs,
            averageResponseTimeMs,
            throughputPerSec: totalTimeMs > 0 ? (totalOps / totalTimeMs) * 1000 : 0,
            errorRate: totalOps > 0 ? (failedOps / totalOps) * 100 : 0,
            percentile95Ms: sortedTimes[p95Index] || 0,
            percentile99Ms: sortedTimes[p99Index] || 0,
            timestamp: new Date().toISOString(),
        };
    }
    static async runFullBenchmark() {
        const results = {};
        results.createPlant = await this.benchmarkCreatePlant(100);
        results.readPlants = await this.benchmarkReadPlants(100);
        results.updatePlant = await this.benchmarkUpdatePlant(100);
        results.deletePlant = await this.benchmarkDeletePlant(50);
        results.createOrder = await this.benchmarkCreateOrder(100);
        results.getProducts = await this.benchmarkGetProducts(100);
        results.createPost = await this.benchmarkCreatePost(100);
        let fastestOperation = '';
        let fastestTime = Infinity;
        let slowestOperation = '';
        let slowestTime = -Infinity;
        const operations = [
            { name: 'CREATE_PLANT', result: results.createPlant },
            { name: 'READ_PLANTS', result: results.readPlants },
            { name: 'UPDATE_PLANT', result: results.updatePlant },
            { name: 'DELETE_PLANT', result: results.deletePlant },
            { name: 'CREATE_ORDER', result: results.createOrder },
            { name: 'GET_PRODUCTS', result: results.getProducts },
            { name: 'CREATE_POST', result: results.createPost },
        ];
        for (const op of operations) {
            if (op.result && op.result.averageTimeMs) {
                if (op.result.averageTimeMs < fastestTime) {
                    fastestTime = op.result.averageTimeMs;
                    fastestOperation = op.name;
                }
                if (op.result.averageTimeMs > slowestTime) {
                    slowestTime = op.result.averageTimeMs;
                    slowestOperation = op.name;
                }
            }
        }
        const benchmarkResults = operations.filter(o => o.result);
        let totalThroughput = 0;
        let totalResponseTime = 0;
        for (const result of benchmarkResults) {
            if (result.result) {
                totalThroughput += result.result.throughputPerSec;
                totalResponseTime += result.result.averageTimeMs;
            }
        }
        if (results.concurrent) {
            totalThroughput += results.concurrent.throughputPerSec;
            totalResponseTime += results.concurrent.averageResponseTimeMs;
        }
        const totalResultsCount = benchmarkResults.length + (results.concurrent ? 1 : 0);
        const avgThroughput = totalResultsCount > 0 ? totalThroughput / totalResultsCount : 0;
        const avgResponse = totalResultsCount > 0 ? totalResponseTime / totalResultsCount : 0;
        const report = {
            summary: {
                totalTests: totalResultsCount,
                averageThroughput: avgThroughput,
                overallAvgResponseMs: avgResponse,
                fastestOperation,
                slowestOperation,
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
            },
            results,
        };
        this.benchmarkResults.set('latest', report);
        await redis_cache_service_1.default.setFast('benchmark:latest', report, 3600);
        await prisma_1.default.benchmarkReport.create({
            data: {
                id: `benchmark_${Date.now()}`,
                report_data: report,
            },
        });
        return report;
    }
    static async getBenchmarkReport() {
        const cached = await redis_cache_service_1.default.getFast('benchmark:latest');
        if (cached) {
            return cached;
        }
        const memoryReport = this.benchmarkResults.get('latest');
        if (memoryReport) {
            return memoryReport;
        }
        const latestReport = await prisma_1.default.benchmarkReport.findFirst({
            orderBy: { created_at: 'desc' },
        });
        if (latestReport) {
            const report = latestReport.report_data;
            await redis_cache_service_1.default.setFast('benchmark:latest', report, 3600);
            return report;
        }
        return null;
    }
    static async getBenchmarkHistory(params = {}) {
        const page = params.page || 1;
        const limit = Math.min(50, params.limit || 10);
        const skip = (page - 1) * limit;
        const where = {};
        if (params.startDate) {
            where.created_at = { gte: params.startDate };
        }
        if (params.endDate) {
            where.created_at = { lte: params.endDate };
        }
        const [reports, total] = await Promise.all([
            prisma_1.default.benchmarkReport.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            prisma_1.default.benchmarkReport.count({ where }),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            data: reports.map(r => r.report_data),
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        };
    }
    static async cleanupTestData() {
        if (this.testUserId) {
            await prisma_1.default.plantTracking.deleteMany({
                where: { userId: this.testUserId },
            });
            await prisma_1.default.order.deleteMany({
                where: { userId: this.testUserId },
            });
            await prisma_1.default.communityPost.deleteMany({
                where: { userId: this.testUserId },
            });
            await prisma_1.default.cartItem.deleteMany({
                where: { userId: this.testUserId },
            });
            await prisma_1.default.user.delete({
                where: { id: this.testUserId },
            });
            this.testUserId = null;
        }
        if (this.testVendorId) {
            await prisma_1.default.produce.deleteMany({
                where: { vendorId: this.testVendorId },
            });
            const vendorUser = await prisma_1.default.vendorProfile.findUnique({
                where: { id: this.testVendorId },
                select: { userId: true },
            });
            if (vendorUser) {
                await prisma_1.default.user.delete({
                    where: { id: vendorUser.userId },
                });
            }
            await prisma_1.default.vendorProfile.delete({
                where: { id: this.testVendorId },
            });
            this.testVendorId = null;
        }
        this.testPlantIds = [];
        this.testProductIds = [];
        this.testPostIds = [];
        await redis_cache_service_1.default.delPattern('benchmark:*');
        this.benchmarkResults.clear();
    }
    static calculateMetrics(operation, iterations, times) {
        const totalTimeMs = times.reduce((a, b) => a + b, 0);
        const averageTimeMs = totalTimeMs / iterations;
        const minTimeMs = Math.min(...times);
        const maxTimeMs = Math.max(...times);
        const throughputPerSec = totalTimeMs > 0 ? (iterations / totalTimeMs) * 1000 : 0;
        return {
            operation,
            iterations,
            totalTimeMs,
            averageTimeMs,
            minTimeMs,
            maxTimeMs,
            throughputPerSec,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.BenchmarkService = BenchmarkService;
//# sourceMappingURL=benchmark.service.js.map