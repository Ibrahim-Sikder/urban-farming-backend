"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBenchmarkHistorySchema = exports.runBenchmarkSchema = void 0;
const zod_1 = require("zod");
exports.runBenchmarkSchema = zod_1.z.object({
    body: zod_1.z.object({
        iterations: zod_1.z.number().min(1).max(500).default(100).optional(),
        concurrentUsers: zod_1.z.number().min(1).max(100).default(50).optional(),
        operationsPerUser: zod_1.z.number().min(1).max(50).default(20).optional(),
    }),
});
exports.getBenchmarkHistorySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        limit: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
        operation: zod_1.z.string().optional(),
    }),
});
//# sourceMappingURL=benchmark.validation.js.map