import { PaginationParams } from '../../shared/types/common.types';

export interface BenchmarkResult {
    operation: string;
    iterations: number;
    totalTimeMs: number;
    averageTimeMs: number;
    minTimeMs: number;
    maxTimeMs: number;
    throughputPerSec: number;
    timestamp: string;
}

export interface ConcurrentBenchmarkResult {
    operation: string;
    concurrentUsers: number;
    operationsPerUser: number;
    totalOperations: number;
    totalTimeMs: number;
    averageResponseTimeMs: number;
    throughputPerSec: number;
    errorRate: number;
    percentile95Ms: number;
    percentile99Ms: number;
    timestamp: string;
}

export interface FullBenchmarkReport {
    summary: {
        totalTests: number;
        averageThroughput: number;
        overallAvgResponseMs: number;
        fastestOperation: string;
        slowestOperation: string;
        timestamp: string;
        environment: string;
    };
    results: {
        createPlant?: BenchmarkResult;
        readPlants?: BenchmarkResult;
        updatePlant?: BenchmarkResult;
        deletePlant?: BenchmarkResult;
        createOrder?: BenchmarkResult;
        getProducts?: BenchmarkResult;
        createPost?: BenchmarkResult;
        concurrent?: ConcurrentBenchmarkResult;
    };
}

export interface BenchmarkQueryParams extends PaginationParams {
    operation?: string;
    startDate?: Date;
    endDate?: Date;
}

export interface BenchmarkHistory {
    id: string;
    report: FullBenchmarkReport;
    createdAt: Date;
}

export { PaginatedResponse } from '../../shared/types/common.types';