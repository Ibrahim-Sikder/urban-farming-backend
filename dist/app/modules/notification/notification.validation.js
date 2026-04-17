"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsReadSchema = exports.markAsReadSchema = exports.getNotificationsSchema = void 0;
const zod_1 = require("zod");
exports.getNotificationsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        limit: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        isRead: zod_1.z.string().transform(val => val === 'true').optional(),
        type: zod_1.z.string().optional(),
    }),
});
exports.markAsReadSchema = zod_1.z.object({
    body: zod_1.z.object({
        notificationIds: zod_1.z.array(zod_1.z.number().int().positive()).min(1, 'At least one notification ID is required'),
    }),
});
exports.markAllAsReadSchema = zod_1.z.object({
    body: zod_1.z.object({
        type: zod_1.z.string().optional(),
    }),
});
//# sourceMappingURL=notification.validation.js.map