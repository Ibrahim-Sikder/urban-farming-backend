import { Router } from 'express';
import { BenchmarkController } from './benchmark.controller';
import { authenticate, authorize } from '../../shared/middleware/auth';
import { rateLimit } from '../../shared/middleware/rate-limit.middleware';

const router = Router();

// All benchmark routes require admin authentication
router.use(authenticate);
router.use(authorize('ADMIN'));

// Individual benchmark endpoints
router.post(
    '/create-plant',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    BenchmarkController.runCreateBenchmark
);

router.post(
    '/read-plants',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    BenchmarkController.runReadBenchmark
);

router.post(
    '/update-plant',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    BenchmarkController.runUpdateBenchmark
);

router.post(
    '/delete-plant',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    BenchmarkController.runDeleteBenchmark
);

router.post(
    '/create-order',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    BenchmarkController.runOrderBenchmark
);

router.post(
    '/get-products',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    BenchmarkController.runProductBenchmark
);

router.post(
    '/create-post',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    BenchmarkController.runPostBenchmark
);

router.post(
    '/concurrent',
    rateLimit({ windowMs: 60 * 1000, max: 3 }),
    BenchmarkController.runConcurrentBenchmark
);

router.post(
    '/full',
    rateLimit({ windowMs: 60 * 1000, max: 2 }),
    BenchmarkController.runFullBenchmark
);

router.get(
    '/report',
    BenchmarkController.getBenchmarkReport
);

router.delete(
    '/cleanup',
    BenchmarkController.cleanupBenchmarkData
);

export const benchmarkRoutes = router;