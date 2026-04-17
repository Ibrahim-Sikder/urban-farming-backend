"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenchmarkController = void 0;
const benchmark_service_1 = require("./benchmark.service");
const response_1 = require("../../shared/utils/response");
class BenchmarkController {
    static async runCreateBenchmark(req, res) {
        try {
            const { iterations = 100 } = req.body;
            const result = await benchmark_service_1.BenchmarkService.benchmarkCreatePlant(Number(iterations));
            response_1.ResponseHandler.success(res, result, 'Create plant benchmark completed');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 500);
        }
    }
    static async runReadBenchmark(req, res) {
        try {
            const { iterations = 100 } = req.body;
            const result = await benchmark_service_1.BenchmarkService.benchmarkReadPlants(Number(iterations));
            response_1.ResponseHandler.success(res, result, 'Read plants benchmark completed');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 500);
        }
    }
    static async runUpdateBenchmark(req, res) {
        try {
            const { iterations = 100 } = req.body;
            const result = await benchmark_service_1.BenchmarkService.benchmarkUpdatePlant(Number(iterations));
            response_1.ResponseHandler.success(res, result, 'Update plant benchmark completed');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 500);
        }
    }
    static async runDeleteBenchmark(req, res) {
        try {
            const { iterations = 50 } = req.body;
            const result = await benchmark_service_1.BenchmarkService.benchmarkDeletePlant(Number(iterations));
            response_1.ResponseHandler.success(res, result, 'Delete plant benchmark completed');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 500);
        }
    }
    static async runOrderBenchmark(req, res) {
        try {
            const { iterations = 100 } = req.body;
            const result = await benchmark_service_1.BenchmarkService.benchmarkCreateOrder(Number(iterations));
            response_1.ResponseHandler.success(res, result, 'Create order benchmark completed');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 500);
        }
    }
    static async runProductBenchmark(req, res) {
        try {
            const { iterations = 100 } = req.body;
            const result = await benchmark_service_1.BenchmarkService.benchmarkGetProducts(Number(iterations));
            response_1.ResponseHandler.success(res, result, 'Get products benchmark completed');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 500);
        }
    }
    static async runPostBenchmark(req, res) {
        try {
            const { iterations = 100 } = req.body;
            const result = await benchmark_service_1.BenchmarkService.benchmarkCreatePost(Number(iterations));
            response_1.ResponseHandler.success(res, result, 'Create post benchmark completed');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 500);
        }
    }
    static async runConcurrentBenchmark(req, res) {
        try {
            const { concurrentUsers = 50, operationsPerUser = 20 } = req.body;
            const result = await benchmark_service_1.BenchmarkService.benchmarkConcurrentOperations(Number(concurrentUsers), Number(operationsPerUser));
            response_1.ResponseHandler.success(res, result, 'Concurrent operations benchmark completed');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 500);
        }
    }
    static async runFullBenchmark(req, res) {
        try {
            const result = await benchmark_service_1.BenchmarkService.runFullBenchmark();
            response_1.ResponseHandler.success(res, result, 'Full benchmark completed successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 500);
        }
    }
    static async getBenchmarkReport(req, res) {
        try {
            const report = await benchmark_service_1.BenchmarkService.getBenchmarkReport();
            if (!report) {
                response_1.ResponseHandler.error(res, 'No benchmark report found. Run benchmark first.', 404);
                return;
            }
            response_1.ResponseHandler.success(res, report, 'Benchmark report fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 500);
        }
    }
    static async getBenchmarkHistory(req, res) {
        try {
            const params = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
                operation: req.query.operation,
            };
            const history = await benchmark_service_1.BenchmarkService.getBenchmarkHistory(params);
            response_1.ResponseHandler.success(res, history, 'Benchmark history fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 500);
        }
    }
    static async cleanupBenchmarkData(req, res) {
        try {
            await benchmark_service_1.BenchmarkService.cleanupTestData();
            response_1.ResponseHandler.success(res, null, 'Benchmark test data cleaned up successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 500);
        }
    }
}
exports.BenchmarkController = BenchmarkController;
//# sourceMappingURL=benchmark.controller.js.map