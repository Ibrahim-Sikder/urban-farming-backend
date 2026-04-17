import { z } from 'zod';

export const runBenchmarkSchema = z.object({
    body: z.object({
        iterations: z.number().min(1).max(500).default(100).optional(),
        concurrentUsers: z.number().min(1).max(100).default(50).optional(),
        operationsPerUser: z.number().min(1).max(50).default(20).optional(),
    }),
});

export const getBenchmarkHistorySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().transform(Number),
        limit: z.string().regex(/^\d+$/).optional().transform(Number),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        operation: z.string().optional(),
    }),
});