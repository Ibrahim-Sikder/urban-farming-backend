import { z } from 'zod';

export const runBenchmarkSchema = z.object({
    body: z.object({
        endpoints: z.array(z.string()).optional(),
        iterations: z.number().min(1).max(200).default(50).optional(),
        concurrent: z.number().min(1).max(20).default(5).optional(),
    }),
});

export const getBenchmarkReportsSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        endpoint: z.string().optional(),
    }),
});