import { Router } from 'express';
import { BenchmarkController } from './benchmark.controller';
import { authenticate, authorize } from '../../shared/middleware/auth';
import { rateLimit } from '../../shared/middleware/rate-limit.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { runBenchmarkSchema, getBenchmarkHistorySchema } from './benchmark.validation';

const router = Router();
router.use(authenticate);
router.use(authorize('ADMIN'));
router.post(
    '/create-plant',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    validate(runBenchmarkSchema),
    BenchmarkController.runCreateBenchmark
);

router.post(
    '/read-plants',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    validate(runBenchmarkSchema),
    BenchmarkController.runReadBenchmark
);

router.post(
    '/update-plant',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    validate(runBenchmarkSchema),
    BenchmarkController.runUpdateBenchmark
);

router.post(
    '/delete-plant',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    validate(runBenchmarkSchema),
    BenchmarkController.runDeleteBenchmark
);

router.post(
    '/create-order',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    validate(runBenchmarkSchema),
    BenchmarkController.runOrderBenchmark
);

router.post(
    '/get-products',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    validate(runBenchmarkSchema),
    BenchmarkController.runProductBenchmark
);

router.post(
    '/create-post',
    rateLimit({ windowMs: 60 * 1000, max: 5 }),
    validate(runBenchmarkSchema),
    BenchmarkController.runPostBenchmark
);

router.post(
    '/concurrent',
    rateLimit({ windowMs: 60 * 1000, max: 3 }),
    validate(runBenchmarkSchema),
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

router.get(
    '/history',
    validate(getBenchmarkHistorySchema),
    BenchmarkController.getBenchmarkHistory
);

router.delete(
    '/cleanup',
    BenchmarkController.cleanupBenchmarkData
);

export const benchmarkRoutes = router;