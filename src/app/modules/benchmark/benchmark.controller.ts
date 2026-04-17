import { Response } from 'express';
import { BenchmarkService } from './benchmark.service';
import { ResponseHandler } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/middleware/auth';

export class BenchmarkController {

    static async runCreateBenchmark(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { iterations = 100 } = req.body;
            const result = await BenchmarkService.benchmarkCreatePlant(Number(iterations));
            ResponseHandler.success(res, result, 'Create plant benchmark completed');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 500);
        }
    }

    static async runReadBenchmark(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { iterations = 100 } = req.body;
            const result = await BenchmarkService.benchmarkReadPlants(Number(iterations));
            ResponseHandler.success(res, result, 'Read plants benchmark completed');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 500);
        }
    }

    static async runUpdateBenchmark(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { iterations = 100 } = req.body;
            const result = await BenchmarkService.benchmarkUpdatePlant(Number(iterations));
            ResponseHandler.success(res, result, 'Update plant benchmark completed');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 500);
        }
    }

    static async runDeleteBenchmark(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { iterations = 50 } = req.body;
            const result = await BenchmarkService.benchmarkDeletePlant(Number(iterations));
            ResponseHandler.success(res, result, 'Delete plant benchmark completed');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 500);
        }
    }

    static async runOrderBenchmark(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { iterations = 100 } = req.body;
            const result = await BenchmarkService.benchmarkCreateOrder(Number(iterations));
            ResponseHandler.success(res, result, 'Create order benchmark completed');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 500);
        }
    }

    static async runProductBenchmark(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { iterations = 100 } = req.body;
            const result = await BenchmarkService.benchmarkGetProducts(Number(iterations));
            ResponseHandler.success(res, result, 'Get products benchmark completed');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 500);
        }
    }

    static async runPostBenchmark(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { iterations = 100 } = req.body;
            const result = await BenchmarkService.benchmarkCreatePost(Number(iterations));
            ResponseHandler.success(res, result, 'Create post benchmark completed');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 500);
        }
    }

    static async runConcurrentBenchmark(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { concurrentUsers = 50, operationsPerUser = 20 } = req.body;
            const result = await BenchmarkService.benchmarkConcurrentOperations(
                Number(concurrentUsers),
                Number(operationsPerUser)
            );
            ResponseHandler.success(res, result, 'Concurrent operations benchmark completed');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 500);
        }
    }

    static async runFullBenchmark(req: AuthRequest, res: Response): Promise<void> {
        try {
            const result = await BenchmarkService.runFullBenchmark();
            ResponseHandler.success(res, result, 'Full benchmark completed successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 500);
        }
    }

    static async getBenchmarkReport(req: AuthRequest, res: Response): Promise<void> {
        try {
            const report = await BenchmarkService.getBenchmarkReport();
            if (!report) {
                ResponseHandler.error(res, 'No benchmark report found. Run benchmark first.', 404);
                return;
            }
            ResponseHandler.success(res, report, 'Benchmark report fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 500);
        }
    }

    static async getBenchmarkHistory(req: AuthRequest, res: Response): Promise<void> {
        try {
            const params = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
                operation: req.query.operation as string,
            };
            const history = await BenchmarkService.getBenchmarkHistory(params);
            ResponseHandler.success(res, history, 'Benchmark history fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 500);
        }
    }

    static async cleanupBenchmarkData(req: AuthRequest, res: Response): Promise<void> {
        try {
            await BenchmarkService.cleanupTestData();
            ResponseHandler.success(res, null, 'Benchmark test data cleaned up successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 500);
        }
    }
}