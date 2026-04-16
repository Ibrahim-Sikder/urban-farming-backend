// modules/community/community.validation.ts
import { z } from 'zod';

export const createPostSchema = z.object({
    body: z.object({
        title: z.string().min(5, 'Title must be at least 5 characters').max(200),
        content: z.string().min(10, 'Content must be at least 10 characters'),
        images: z.array(z.string().url()).optional(),
        tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
    }),
});

export const updatePostSchema = z.object({
    body: z.object({
        title: z.string().min(5).max(200).optional(),
        content: z.string().min(10).optional(),
        images: z.array(z.string().url()).optional(),
        tags: z.array(z.string()).max(10).optional(),
    }),
    params: z.object({
        id: z.string().regex(/^\d+$/, 'Invalid post ID'),
    }),
});

export const createCommentSchema = z.object({
    body: z.object({
        content: z.string().min(1, 'Comment cannot be empty').max(1000),
        parentId: z.number().int().positive().optional(),
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
        tags: z.string().optional(),
        sortBy: z.enum(['latest', 'popular', 'trending']).optional(),
    }),
});