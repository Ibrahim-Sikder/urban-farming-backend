"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postFiltersSchema = exports.createCommentSchema = exports.updatePostSchema = exports.createPostSchema = void 0;
const zod_1 = require("zod");
exports.createPostSchema = zod_1.z.object({
    body: zod_1.z.object({
        postContent: zod_1.z.string().min(1, 'Post content cannot be empty').max(5000, 'Post content too long'),
    }),
});
exports.updatePostSchema = zod_1.z.object({
    body: zod_1.z.object({
        postContent: zod_1.z.string().min(1).max(5000).optional(),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^\d+$/, 'Invalid post ID'),
    }),
});
exports.createCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string().min(1, 'Comment cannot be empty').max(1000),
    }),
    params: zod_1.z.object({
        postId: zod_1.z.string().regex(/^\d+$/, 'Invalid post ID'),
    }),
});
exports.postFiltersSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        limit: zod_1.z.string().regex(/^\d+$/).optional().transform(Number),
        search: zod_1.z.string().optional(),
    }),
});
//# sourceMappingURL=community.validation.js.map