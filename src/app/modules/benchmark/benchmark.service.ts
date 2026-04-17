import prisma from '../../config/prisma';
import * as bcrypt from 'bcryptjs';
import {
    BenchmarkResult,
    ConcurrentBenchmarkResult,
    FullBenchmarkReport,
} from './benchmark.type';

export class BenchmarkService {

    private static benchmarkResults: Map<string, FullBenchmarkReport> = new Map();
    private static testUserId: number | null = null;
    private static testVendorId: number | null = null;
    private static testPlantIds: number[] = [];
    private static testProductIds: number[] = [];

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
                this.testProductIds.push(product.id);
            }
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
                console.error(`Create plant error at iteration ${i}:`, error);
                times.push(Date.now() - start);
            }
        }

        return this.calculateMetrics('CREATE_PLANT', iterations, times);
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
                    where: { certificationStatus: 'APPROVED' },
                    take: pageSize,
                    skip: (i % 10) * pageSize,
                    orderBy: { createdAt: 'desc' },
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
                await prisma.communityPost.create({
                    data: {
                        userId: this.testUserId!,
                        postContent: `This is benchmark post number ${i}. Testing performance of community forum module.`,
                    },
                });
                times.push(Date.now() - start);
            } catch (error) {
                times.push(Date.now() - start);
            }
        }

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

        // Calculate summary - Fixed type checking
        const benchmarkResults = Object.values(results).filter((r): r is BenchmarkResult =>
            r !== undefined && 'averageTimeMs' in r && r.averageTimeMs !== undefined
        );

        const concurrentResult = results.concurrent;

        let totalThroughput = 0;
        let totalResponseTime = 0;

        // Sum up benchmark results (non-concurrent)
        for (const result of benchmarkResults) {
            if (result.throughputPerSec) {
                totalThroughput += result.throughputPerSec;
            }
            if (result.averageTimeMs) {
                totalResponseTime += result.averageTimeMs;
            }
        }

        // Add concurrent result if exists
        if (concurrentResult) {
            if (concurrentResult.throughputPerSec) {
                totalThroughput += concurrentResult.throughputPerSec;
            }
            if (concurrentResult.averageResponseTimeMs) {
                totalResponseTime += concurrentResult.averageResponseTimeMs;
            }
        }

        const totalResultsCount = benchmarkResults.length + (concurrentResult ? 1 : 0);
        const avgThroughput = totalResultsCount > 0 ? totalThroughput / totalResultsCount : 0;
        const avgResponse = totalResultsCount > 0 ? totalResponseTime / totalResultsCount : 0;

        const report: FullBenchmarkReport = {
            summary: {
                totalTests: totalResultsCount,
                averageThroughput: avgThroughput,
                overallAvgResponseMs: avgResponse,
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
            },
            results,
        };

        // Save report
        this.benchmarkResults.set('latest', report);

        return report;
    }

    // ============ GET BENCHMARK REPORT ============
    static async getBenchmarkReport(): Promise<FullBenchmarkReport | null> {
        return this.benchmarkResults.get('latest') || null;
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
            await prisma.user.deleteMany({
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
                await prisma.user.deleteMany({
                    where: { id: vendorUser.userId },
                });
            }
            await prisma.vendorProfile.deleteMany({
                where: { id: this.testVendorId },
            });
            this.testVendorId = null;
        }

        this.testPlantIds = [];
        this.testProductIds = [];
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