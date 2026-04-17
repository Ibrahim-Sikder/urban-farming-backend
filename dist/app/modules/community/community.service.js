"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
const prisma_query_builder_1 = require("../../shared/utils/prisma-query-builder");
class CommunityService {
    static async createPost(userId, data) {
        const post = await prisma_1.default.$queryRaw `
            INSERT INTO "CommunityPost" ("userId", "postContent", "postDate", "updatedAt")
            VALUES (${userId}, ${data.postContent}, NOW(), NOW())
            RETURNING id, "postContent", "postDate", "updatedAt"
        `;
        const postData = post[0];
        const user = await prisma_1.default.$queryRaw `
            SELECT id, name, email, "profileImage"
            FROM "User"
            WHERE id = ${userId}
            LIMIT 1
        `;
        const response = {
            id: postData.id,
            postContent: postData.postContent,
            postDate: postData.postDate,
            updatedAt: postData.updatedAt,
            user: {
                id: user[0].id,
                name: user[0].name,
                email: user[0].email,
                profileImage: user[0].profileImage || undefined,
            },
            commentCount: 0,
        };
        await redis_cache_service_1.default.delPattern('community:posts:*');
        return response;
    }
    static async updatePost(userId, postId, data) {
        const existing = await prisma_1.default.$queryRaw `
            SELECT id FROM "CommunityPost"
            WHERE id = ${postId} AND "userId" = ${userId}
            LIMIT 1
        `;
        if (!existing || existing.length === 0) {
            throw new Error('Post not found or unauthorized');
        }
        const updated = await prisma_1.default.$queryRaw `
            UPDATE "CommunityPost"
            SET 
                "postContent" = COALESCE(${data.postContent}, "postContent"),
                "updatedAt" = NOW()
            WHERE id = ${postId}
            RETURNING id, "postContent", "postDate", "updatedAt"
        `;
        const postData = updated[0];
        const user = await prisma_1.default.$queryRaw `
            SELECT id, name, email, "profileImage"
            FROM "User"
            WHERE id = ${userId}
            LIMIT 1
        `;
        const commentCount = await prisma_1.default.$queryRaw `
            SELECT COUNT(*) as count FROM "CommunityComment" WHERE "postId" = ${postId}
        `;
        const response = {
            id: postData.id,
            postContent: postData.postContent,
            postDate: postData.postDate,
            updatedAt: postData.updatedAt,
            user: {
                id: user[0].id,
                name: user[0].name,
                email: user[0].email,
                profileImage: user[0].profileImage || undefined,
            },
            commentCount: Number(commentCount[0]?.count) || 0,
        };
        await Promise.all([
            redis_cache_service_1.default.delPattern('community:posts:*'),
            redis_cache_service_1.default.del(`community:post:${postId}`)
        ]);
        return response;
    }
    static async getAllPosts(queryParams = {}) {
        const cacheKey = `community:posts:${JSON.stringify(queryParams)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const queryBuilder = new prisma_query_builder_1.PrismaQueryBuilder('CommunityPost', queryParams);
        queryBuilder.setSearchFields(['postContent']);
        if (queryParams.dateFrom) {
            const dateCondition = client_1.Prisma.sql `"postDate" >= ${queryParams.dateFrom}`;
            queryBuilder.addCustomCondition(dateCondition);
        }
        if (queryParams.dateTo) {
            const dateCondition = client_1.Prisma.sql `"postDate" <= ${queryParams.dateTo}`;
            queryBuilder.addCustomCondition(dateCondition);
        }
        if (queryParams.userId) {
            const userCondition = client_1.Prisma.sql `"userId" = ${queryParams.userId}`;
            queryBuilder.addCustomCondition(userCondition);
        }
        const customQuery = client_1.Prisma.sql `
            SELECT 
                cp.id,
                cp."postContent",
                cp."postDate",
                cp."updatedAt",
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                u."profileImage" as user_profileImage,
                (SELECT COUNT(*) FROM "CommunityComment" WHERE "postId" = cp.id) as comment_count
            FROM "CommunityPost" cp
            LEFT JOIN "User" u ON cp."userId" = u.id
        `;
        const result = await queryBuilder.execute(customQuery);
        const transformedPosts = result.data.map((post) => ({
            id: post.id,
            postContent: post.postContent,
            postDate: post.postDate,
            updatedAt: post.updatedAt,
            user: {
                id: post.user_id,
                name: post.user_name,
                email: post.user_email,
                profileImage: post.user_profileimage || undefined,
            },
            commentCount: Number(post.comment_count) || 0,
        }));
        const response = {
            data: transformedPosts,
            meta: result.meta
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async getPostById(postId) {
        const cacheKey = `community:post:${postId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const post = await prisma_1.default.$queryRaw `
            SELECT 
                cp.id,
                cp."postContent",
                cp."postDate",
                cp."updatedAt",
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                u."profileImage" as user_profileImage,
                (SELECT COUNT(*) FROM "CommunityComment" WHERE "postId" = cp.id) as comment_count
            FROM "CommunityPost" cp
            LEFT JOIN "User" u ON cp."userId" = u.id
            WHERE cp.id = ${postId}
            LIMIT 1
        `;
        if (!post || post.length === 0) {
            throw new Error('Post not found');
        }
        const postData = post[0];
        const comments = await prisma_1.default.$queryRaw `
            SELECT 
                cc.id,
                cc.content,
                cc."createdAt",
                u.id as user_id,
                u.name as user_name,
                u."profileImage" as user_profileImage
            FROM "CommunityComment" cc
            LEFT JOIN "User" u ON cc."userId" = u.id
            WHERE cc."postId" = ${postId}
            ORDER BY cc."createdAt" ASC
        `;
        const formattedComments = comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            user: {
                id: comment.user_id,
                name: comment.user_name,
                profileImage: comment.user_profileimage || undefined,
            },
        }));
        const response = {
            id: postData.id,
            postContent: postData.postContent,
            postDate: postData.postDate,
            updatedAt: postData.updatedAt,
            user: {
                id: postData.user_id,
                name: postData.user_name,
                email: postData.user_email,
                profileImage: postData.user_profileimage || undefined,
            },
            commentCount: Number(postData.comment_count) || 0,
            comments: formattedComments,
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 300);
        return response;
    }
    static async deletePost(userId, postId, isAdmin = false) {
        let whereClause = `id = ${postId}`;
        if (!isAdmin) {
            whereClause += ` AND "userId" = ${userId}`;
        }
        const existing = await prisma_1.default.$queryRaw `
            SELECT id FROM "CommunityPost"
            WHERE ${client_1.Prisma.raw(whereClause)}
            LIMIT 1
        `;
        if (!existing || existing.length === 0) {
            throw new Error('Post not found or unauthorized');
        }
        await prisma_1.default.$executeRaw `DELETE FROM "CommunityComment" WHERE "postId" = ${postId}`;
        await prisma_1.default.$executeRaw `DELETE FROM "CommunityPost" WHERE id = ${postId}`;
        await Promise.all([
            redis_cache_service_1.default.delPattern('community:posts:*'),
            redis_cache_service_1.default.del(`community:post:${postId}`)
        ]);
        return { message: 'Post deleted successfully' };
    }
    static async createComment(userId, postId, data) {
        const post = await prisma_1.default.$queryRaw `
            SELECT id FROM "CommunityPost" WHERE id = ${postId} LIMIT 1
        `;
        if (!post || post.length === 0) {
            throw new Error('Post not found');
        }
        const comment = await prisma_1.default.$queryRaw `
            INSERT INTO "CommunityComment" ("postId", "userId", content, "createdAt", "updatedAt")
            VALUES (${postId}, ${userId}, ${data.content}, NOW(), NOW())
            RETURNING id, content, "createdAt"
        `;
        const commentData = comment[0];
        const user = await prisma_1.default.$queryRaw `
            SELECT id, name, "profileImage"
            FROM "User"
            WHERE id = ${userId}
            LIMIT 1
        `;
        const response = {
            id: commentData.id,
            content: commentData.content,
            createdAt: commentData.createdAt,
            user: {
                id: user[0].id,
                name: user[0].name,
                profileImage: user[0].profileImage || undefined,
            },
        };
        await Promise.all([
            redis_cache_service_1.default.delPattern('community:posts:*'),
            redis_cache_service_1.default.del(`community:post:${postId}`),
            redis_cache_service_1.default.delPattern(`community:comments:${postId}:*`)
        ]);
        return response;
    }
    static async getComments(postId, queryParams = {}) {
        const cacheKey = `community:comments:${postId}:${JSON.stringify(queryParams)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const page = queryParams.page || 1;
        const limit = Math.min(50, queryParams.limit || 20);
        const offset = (page - 1) * limit;
        const sortBy = queryParams.sortBy || 'createdAt';
        const sortOrder = queryParams.sortOrder || 'asc';
        let whereClause = `"postId" = ${postId}`;
        if (queryParams.userId) {
            whereClause += ` AND "userId" = ${queryParams.userId}`;
        }
        const countResult = await prisma_1.default.$queryRaw `
            SELECT COUNT(*) as count
            FROM "CommunityComment"
            WHERE ${client_1.Prisma.raw(whereClause)}
        `;
        const total = Number(countResult[0]?.count) || 0;
        const comments = await prisma_1.default.$queryRaw `
            SELECT 
                cc.id,
                cc.content,
                cc."createdAt",
                u.id as user_id,
                u.name as user_name,
                u."profileImage" as user_profileImage
            FROM "CommunityComment" cc
            LEFT JOIN "User" u ON cc."userId" = u.id
            WHERE ${client_1.Prisma.raw(whereClause)}
            ORDER BY "${sortBy}" ${client_1.Prisma.raw(sortOrder === 'asc' ? 'ASC' : 'DESC')}
            LIMIT ${limit} OFFSET ${offset}
        `;
        const transformedComments = comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            user: {
                id: comment.user_id,
                name: comment.user_name,
                profileImage: comment.user_profileimage || undefined,
            },
        }));
        const totalPages = Math.ceil(total / limit);
        const response = {
            data: transformedComments,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async deleteComment(userId, commentId, isAdmin = false) {
        let whereClause = `id = ${commentId}`;
        if (!isAdmin) {
            whereClause += ` AND "userId" = ${userId}`;
        }
        const comment = await prisma_1.default.$queryRaw `
            SELECT "postId" FROM "CommunityComment"
            WHERE ${client_1.Prisma.raw(whereClause)}
            LIMIT 1
        `;
        if (!comment || comment.length === 0) {
            throw new Error('Comment not found or unauthorized');
        }
        const postId = comment[0].postId;
        await prisma_1.default.$executeRaw `DELETE FROM "CommunityComment" WHERE id = ${commentId}`;
        await Promise.all([
            redis_cache_service_1.default.delPattern('community:posts:*'),
            redis_cache_service_1.default.del(`community:post:${postId}`),
            redis_cache_service_1.default.delPattern(`community:comments:${postId}:*`)
        ]);
        return { message: 'Comment deleted successfully' };
    }
    static async getUserPosts(userId, queryParams = {}) {
        const cacheKey = `community:user:posts:${userId}:${JSON.stringify(queryParams)}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const paramsWithUser = { ...queryParams, userId };
        const result = await this.getAllPosts(paramsWithUser);
        await redis_cache_service_1.default.setFast(cacheKey, result, 120);
        return result;
    }
    static async getTrendingPosts(limit = 10) {
        const cacheKey = `community:trending:posts`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached) {
            return cached;
        }
        const posts = await prisma_1.default.$queryRaw `
            SELECT 
                cp.id,
                cp."postContent",
                cp."postDate",
                cp."updatedAt",
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                u."profileImage" as user_profileImage,
                COUNT(cc.id) as comment_count
            FROM "CommunityPost" cp
            LEFT JOIN "User" u ON cp."userId" = u.id
            LEFT JOIN "CommunityComment" cc ON cp.id = cc."postId"
            WHERE cp."postDate" >= NOW() - INTERVAL '7 days'
            GROUP BY cp.id, u.id
            ORDER BY comment_count DESC, cp."postDate" DESC
            LIMIT ${limit}
        `;
        const trendingPosts = posts.map((post) => ({
            id: post.id,
            postContent: post.postContent,
            postDate: post.postDate,
            updatedAt: post.updatedAt,
            user: {
                id: post.user_id,
                name: post.user_name,
                email: post.user_email,
                profileImage: post.user_profileimage || undefined,
            },
            commentCount: Number(post.comment_count) || 0,
        }));
        await redis_cache_service_1.default.setFast(cacheKey, trendingPosts, 300);
        return trendingPosts;
    }
}
exports.CommunityService = CommunityService;
//# sourceMappingURL=community.service.js.map