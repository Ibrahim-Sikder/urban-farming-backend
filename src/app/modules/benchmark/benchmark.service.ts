import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import * as bcrypt from 'bcryptjs';
import {
    BenchmarkResult,
    ConcurrentBenchmarkResult,
    FullBenchmarkReport,
    BenchmarkQueryParams,
    PaginatedResponse
} from './benchmark.type';

export class BenchmarkService {

    private static benchmarkResults: Map<string, FullBenchmarkReport> = new Map();
    private static testUserId: number | null = null;
    private static testVendorId: number | null = null;
    private static testPlantIds: number[] = [];
    private static testProductIds: number[] = [];
    private static testPostIds: number[] = [];

    // ============ SETUP TEST DATA ============
    static async setupTestData(): Promise<{ userId: number; vendorId: number }> {
        // Create test user if not exists
        if (!this.testUserId) {
            const testUser = await prisma.user.create({
                data: {
                    name: 'Benchmark User',
                    email: `benchmark_${Date.now()}@test.com`,
                    password: await bcrypt.hash('password123', 10),
                    role: 'CUSTOMER',
                    status: 'ACTIVE',
                },
            });
            this.testUserId = testUser.id;

            // Create test vendor
            const testVendor = await prisma.user.create({
                data: {
                    name: 'Benchmark Vendor',
                    email: `vendor_benchmark_${Date.now()}@test.com`,
                    password: await bcrypt.hash('password123', 10),
                    role: 'VENDOR',
                    status: 'ACTIVE',
                },
            });

            const vendorProfile = await prisma.vendorProfile.create({
                data: {
                    userId: testVendor.id,
                    farmName: 'Benchmark Farm',
                    farmLocation: 'Test Location',
                    certificationStatus: 'APPROVED',
                },
            });
            this.testVendorId = vendorProfile.id;

            // Create test products
            const products = [];
            for (let i = 0; i < 50; i++) {
                const product = await prisma.produce.create({
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

    // ============ BENCHMARK: CREATE PLANT ============
    static async benchmarkCreatePlant(iterations: number = 100): Promise<BenchmarkResult> {
        await this.setupTestData();
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            try {
                const plant = await prisma.plantTracking.create({
                    data: {
                        userId: this.testUserId!,
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
            } catch (error) {
                times.push(Date.now() - start);
            }
        }

        const result = this.calculateMetrics('CREATE_PLANT', iterations, times);

        // Clear cache after benchmark
        await RedisCacheService.delPattern(`plants:${this.testUserId}:*`);

        return result;
    }

    // ============ BENCHMARK: READ PLANTS ============
    static async benchmarkReadPlants(iterations: number = 100): Promise<BenchmarkResult> {
        await this.setupTestData();
        const times: number[] = [];

        // Ensure we have plants to read
        if (this.testPlantIds.length === 0) {
            await this.benchmarkCreatePlant(10);
        }

        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            try {
                await prisma.plantTracking.findMany({
                    where: { userId: this.testUserId! },
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
            } catch (error) {
                times.push(Date.now() - start);
            }
        }

        return this.calculateMetrics('READ_PLANTS', iterations, times);
    }

    // ============ BENCHMARK: UPDATE PLANT ============
    static async benchmarkUpdatePlant(iterations: number = 100): Promise<BenchmarkResult> {
        await this.setupTestData();
        const times: number[] = [];

        if (this.testPlantIds.length === 0) {
            await this.benchmarkCreatePlant(10);
        }

        for (let i = 0; i < iterations; i++) {
            const plantId = this.testPlantIds[i % this.testPlantIds.length];
            const start = Date.now();
            try {
                await prisma.plantTracking.update({
                    where: { id: plantId },
                    data: {
                        healthStatus: i % 2 === 0 ? 'MODERATE' : 'HEALTHY',
                        growthStage: i % 3 === 0 ? 'VEGETATIVE' : 'FLOWERING',
                        notes: `Updated at iteration ${i}`,
                    },
                });
                times.push(Date.now() - start);
            } catch (error) {
                times.push(Date.now() - start);
            }
        }

        // Clear cache
        await RedisCacheService.delPattern(`plants:${this.testUserId}:*`);

        return this.calculateMetrics('UPDATE_PLANT', iterations, times);
    }

    // ============ BENCHMARK: DELETE PLANT ============
    static async benchmarkDeletePlant(iterations: number = 100): Promise<BenchmarkResult> {
        await this.setupTestData();
        const times: number[] = [];

        // Create fresh plants for deletion
        const tempPlantIds: number[] = [];
        for (let i = 0; i < iterations; i++) {
            const plant = await prisma.plantTracking.create({
                data: {
                    userId: this.testUserId!,
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
                await prisma.plantTracking.delete({
                    where: { id: tempPlantIds[i] },
                });
                times.push(Date.now() - start);
            } catch (error) {
                times.push(Date.now() - start);
            }
        }

        return this.calculateMetrics('DELETE_PLANT', iterations, times);
    }

    // ============ BENCHMARK: CREATE ORDER ============
    static async benchmarkCreateOrder(iterations: number = 100): Promise<BenchmarkResult> {
        await this.setupTestData();
        const times: number[] = [];

        if (this.testProductIds.length === 0) {
            throw new Error('No test products available');
        }

        for (let i = 0; i < iterations; i++) {
            const productId = this.testProductIds[i % this.testProductIds.length];
            const start = Date.now();
            try {
                const product = await prisma.produce.findUnique({
                    where: { id: productId },
                    select: { price: true, availableQuantity: true }
                });

                if (product && product.availableQuantity >= 1) {
                    await prisma.order.create({
                        data: {
                            userId: this.testUserId!,
                            produceId: productId,
                            vendorId: this.testVendorId!,
                            quantity: 1,
                            totalPrice: product.price,
                            status: 'PENDING',
                        },
                    });
                }
                times.push(Date.now() - start);
            } catch (error) {
                times.push(Date.now() - start);
            }
        }

        // Clear cache
        await RedisCacheService.delPattern(`marketplace:orders:${this.testUserId}:*`);

        return this.calculateMetrics('CREATE_ORDER', iterations, times);
    }

    // ============ BENCHMARK: GET PRODUCTS WITH PAGINATION ============
    static async benchmarkGetProducts(iterations: number = 100): Promise<BenchmarkResult> {
        await this.setupTestData();
        const times: number[] = [];

        const pageSizes = [10, 20, 50];

        for (let i = 0; i < iterations; i++) {
            const pageSize = pageSizes[i % pageSizes.length];
            const start = Date.now();
            try {
                await prisma.produce.findMany({
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
            } catch (error) {
                times.push(Date.now() - start);
            }
        }

        return this.calculateMetrics('GET_PRODUCTS', iterations, times);
    }

    // ============ BENCHMARK: CREATE COMMUNITY POST ============
    static async benchmarkCreatePost(iterations: number = 100): Promise<BenchmarkResult> {
        await this.setupTestData();
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            try {
                const post = await prisma.communityPost.create({
                    data: {
                        userId: this.testUserId!,
                        postContent: `This is benchmark post number ${i}. Testing performance of community forum module.`,
                    },
                });
                this.testPostIds.push(post.id);
                times.push(Date.now() - start);
            } catch (error) {
                times.push(Date.now() - start);
            }
        }

        // Clear cache
        await RedisCacheService.delPattern('community:posts:*');

        return this.calculateMetrics('CREATE_POST', iterations, times);
    }

    // ============ BENCHMARK: CONCURRENT OPERATIONS ============
    static async benchmarkConcurrentOperations(
        concurrentUsers: number = 50,
        operationsPerUser: number = 20
    ): Promise<ConcurrentBenchmarkResult> {
        await this.setupTestData();

        const startTime = Date.now();
        let successfulOps = 0;
        let failedOps = 0;
        const responseTimes: number[] = [];

        const promises: Promise<void>[] = [];

        for (let user = 0; user < concurrentUsers; user++) {
            const promise = (async () => {
                for (let op = 0; op < operationsPerUser; op++) {
                    const opStart = Date.now();
                    try {
                        await prisma.plantTracking.create({
                            data: {
                                userId: this.testUserId!,
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
                    } catch (error) {
                        failedOps++;
                        responseTimes.push(Date.now() - opStart);
                    }
                    // Small delay to simulate real user behavior
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            })();
            promises.push(promise);
        }

        await Promise.all(promises);

        const totalTimeMs = Date.now() - startTime;
        const totalOps = successfulOps + failedOps;

        // Calculate percentiles
        const sortedTimes = [...responseTimes].sort((a, b) => a - b);
        const p95Index = Math.floor(sortedTimes.length * 0.95);
        const p99Index = Math.floor(sortedTimes.length * 0.99);

        const averageResponseTimeMs = responseTimes.length > 0
            ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
            : 0;

        // Clear cache
        await RedisCacheService.delPattern(`plants:${this.testUserId}:*`);

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

    // ============ RUN FULL BENCHMARK ============
    static async runFullBenchmark(): Promise<FullBenchmarkReport> {
        const results: FullBenchmarkReport['results'] = {};

        console.log('🚀 Starting full benchmark...');
        console.log('📊 This may take a few minutes...\n');

        // Sequential benchmarks
        console.log('📊 Testing CREATE PLANT...');
        results.createPlant = await this.benchmarkCreatePlant(100);

        console.log('📊 Testing READ PLANTS...');
        results.readPlants = await this.benchmarkReadPlants(100);

        console.log('📊 Testing UPDATE PLANT...');
        results.updatePlant = await this.benchmarkUpdatePlant(100);

        console.log('📊 Testing DELETE PLANT...');
        results.deletePlant = await this.benchmarkDeletePlant(50);

        console.log('📊 Testing CREATE ORDER...');
        results.createOrder = await this.benchmarkCreateOrder(100);

        console.log('📊 Testing GET PRODUCTS...');
        results.getProducts = await this.benchmarkGetProducts(100);

        console.log('📊 Testing CREATE POST...');
        results.createPost = await this.benchmarkCreatePost(100);

        // Concurrent benchmark
        console.log('📊 Testing CONCURRENT OPERATIONS...');
        results.concurrent = await this.benchmarkConcurrentOperations(30, 15);

        // Find fastest and slowest operations
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

        // Calculate summary
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

        const report: FullBenchmarkReport = {
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

        // Save report to memory and cache
        this.benchmarkResults.set('latest', report);
        await RedisCacheService.setFast('benchmark:latest', report, 3600);

        // Save to database for history
        await prisma.benchmarkReport.create({
            data: {
                id: `benchmark_${Date.now()}`,
                report_data: report as any,
            },
        });

        console.log('\n✅ Full benchmark completed!');
        console.log(`📈 Average Throughput: ${avgThroughput.toFixed(2)} ops/sec`);
        console.log(`⚡ Average Response: ${avgResponse.toFixed(2)}ms`);
        console.log(`🚀 Fastest: ${fastestOperation} (${fastestTime.toFixed(2)}ms)`);
        console.log(`🐌 Slowest: ${slowestOperation} (${slowestTime.toFixed(2)}ms)\n`);

        return report;
    }

    // ============ GET LATEST BENCHMARK REPORT ============
    static async getBenchmarkReport(): Promise<FullBenchmarkReport | null> {
        // Try cache first
        const cached = await RedisCacheService.getFast<FullBenchmarkReport>('benchmark:latest');
        if (cached) {
            return cached;
        }

        // Try memory
        const memoryReport = this.benchmarkResults.get('latest');
        if (memoryReport) {
            return memoryReport;
        }

        // Try database for latest
        const latestReport = await prisma.benchmarkReport.findFirst({
            orderBy: { created_at: 'desc' },
        });

        if (latestReport) {
            const report = latestReport.report_data as unknown as FullBenchmarkReport;
            await RedisCacheService.setFast('benchmark:latest', report, 3600);
            return report;
        }

        return null;
    }

    // ============ GET BENCHMARK HISTORY ============
    static async getBenchmarkHistory(params: BenchmarkQueryParams = {}): Promise<PaginatedResponse<FullBenchmarkReport>> {
        const page = params.page || 1;
        const limit = Math.min(50, params.limit || 10);
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.startDate) {
            where.created_at = { gte: params.startDate };
        }
        if (params.endDate) {
            where.created_at = { lte: params.endDate };
        }

        const [reports, total] = await Promise.all([
            prisma.benchmarkReport.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            prisma.benchmarkReport.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data: reports.map(r => r.report_data as unknown as FullBenchmarkReport),
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

    // ============ CLEANUP TEST DATA ============
    static async cleanupTestData(): Promise<void> {
        if (this.testUserId) {
            await prisma.plantTracking.deleteMany({
                where: { userId: this.testUserId },
            });
            await prisma.order.deleteMany({
                where: { userId: this.testUserId },
            });
            await prisma.communityPost.deleteMany({
                where: { userId: this.testUserId },
            });
            await prisma.cartItem.deleteMany({
                where: { userId: this.testUserId },
            });
            await prisma.user.delete({
                where: { id: this.testUserId },
            });
            this.testUserId = null;
        }

        if (this.testVendorId) {
            await prisma.produce.deleteMany({
                where: { vendorId: this.testVendorId },
            });
            const vendorUser = await prisma.vendorProfile.findUnique({
                where: { id: this.testVendorId },
                select: { userId: true },
            });
            if (vendorUser) {
                await prisma.user.delete({
                    where: { id: vendorUser.userId },
                });
            }
            await prisma.vendorProfile.delete({
                where: { id: this.testVendorId },
            });
            this.testVendorId = null;
        }

        this.testPlantIds = [];
        this.testProductIds = [];
        this.testPostIds = [];

        // Clear benchmark cache
        await RedisCacheService.delPattern('benchmark:*');
        this.benchmarkResults.clear();

        console.log('✅ Benchmark test data cleaned up');
    }

    // ============ HELPER: CALCULATE METRICS ============
    private static calculateMetrics(
        operation: string,
        iterations: number,
        times: number[]
    ): BenchmarkResult {
        const totalTimeMs = times.reduce((a: number, b: number) => a + b, 0);
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