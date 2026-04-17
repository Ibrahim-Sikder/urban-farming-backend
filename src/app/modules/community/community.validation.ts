// modules/community/community.validation.ts
import { z } from 'zod';

export const createPostSchema = z.object({
    body: z.object({
        postContent: z.string().min(1, 'Post content cannot be empty').max(5000, 'Post content too long'),
    }),
});

export const updatePostSchema = z.object({
    body: z.object({
        postContent: z.string().min(1).max(5000).optional(),
    }),
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid post ID'),
    }),
});

export const createCommentSchema = z.object({
    body: z.object({
        content: z.string().min(1, 'Comment cannot be empty').max(1000),
    }),
    params: z.object({
        postId: z.string().regex(/^\d+$/, 'Invalid post ID'),
    }),
});

export const postFiltersSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional().transform(Number),
        limit: z.string().regex(/^\d+$/).optional().transform(Number),
        search: z.string().optional(),
    }),
});