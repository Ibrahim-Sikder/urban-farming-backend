"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardFiltersSchema = exports.moderatePostSchema = exports.approveRentalSpaceSchema = exports.verifyCertificationSchema = exports.verifyVendorSchema = exports.updateUserStatusSchema = void 0;
const zod_1 = require("zod");
exports.updateUserStatusSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid user ID'),
    }),
    body: zod_1.z.object({
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
    }),
});
exports.verifyVendorSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid vendor ID'),
    }),
    body: zod_1.z.object({
        status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED']),
        rejectionReason: zod_1.z.string().optional(),
    }),
});
exports.verifyCertificationSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid certification ID'),
    }),
    body: zod_1.z.object({
        status: zod_1.z.enum(['PENDING', 'APPROVED', 'REJECTED']),
        verificationNotes: zod_1.z.string().optional(),
    }),
});
exports.approveRentalSpaceSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid space ID'),
    }),
    body: zod_1.z.object({
        isApproved: zod_1.z.boolean(),
        rejectionReason: zod_1.z.string().optional(),
    }),
});
exports.moderatePostSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid post ID'),
    }),
    body: zod_1.z.object({
        isApproved: zod_1.z.boolean(),
        rejectionReason: zod_1.z.string().optional(),
    }),
});
exports.dashboardFiltersSchema = zod_1.z.object({
    query: zod_1.z.object({
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
    }),
});
//# sourceMappingURL=admin.validation.js.map