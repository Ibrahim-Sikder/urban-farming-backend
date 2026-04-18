"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityService = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const redis_cache_service_1 = __importDefault(require("../../services/redis-cache.service"));
const socket_service_1 = __importDefault(require("../../services/socket.service"));
class CommunityService {
    static async createPost(userId, data) {
        const post = await prisma_1.default.communityPost.create({
            data: { userId, postContent: data.postContent },
            include: {
                user: { select: { id: true, name: true, email: true, profileImage: true } }
            }
        });
        const response = {
            id: post.id, postContent: post.postContent, postDate: post.postDate,
            updatedAt: post.updatedAt,
            user: {
                id: post.user.id, name: post.user.name, email: post.user.email,
                profileImage: post.user.profileImage || undefined,
            },
            commentCount: 0,
        };
        await redis_cache_service_1.default.delPattern('community:posts:*');
        return response;
    }
    static async updatePost(userId, postId, data) {
        const existingPost = await prisma_1.default.communityPost.findFirst({
            where: { id: postId, userId }, select: { id: true }
        });
        if (!existingPost)
            throw new Error('Post not found or unauthorized');
        const updatedPost = await prisma_1.default.communityPost.update({
            where: { id: postId },
            data: { postContent: data.postContent },
            include: {
                user: { select: { id: true, name: true, email: true, profileImage: true } }
            }
        });
        const commentCount = await prisma_1.default.communityComment.count({ where: { postId } });
        const response = {
            id: updatedPost.id, postContent: updatedPost.postContent,
            postDate: updatedPost.postDate, updatedAt: updatedPost.updatedAt,
            user: {
                id: updatedPost.user.id, name: updatedPost.user.name,
                email: updatedPost.user.email, profileImage: updatedPost.user.profileImage || undefined,
            },
            commentCount,
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
        if (cached)
            return cached;
        const page = queryParams.page || 1;
        const limit = Math.min(50, queryParams.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = queryParams.sortBy || 'postDate';
        const sortOrder = queryParams.sortOrder || 'desc';
        const where = {};
        if (queryParams.searchTerm)
            where.postContent = { contains: queryParams.searchTerm, mode: 'insensitive' };
        if (queryParams.userId)
            where.userId = queryParams.userId;
        if (queryParams.dateFrom || queryParams.dateTo) {
            where.postDate = {};
            if (queryParams.dateFrom)
                where.postDate.gte = queryParams.dateFrom;
            if (queryParams.dateTo)
                where.postDate.lte = queryParams.dateTo;
        }
        const [posts, total] = await Promise.all([
            prisma_1.default.communityPost.findMany({
                where, skip, take: limit, orderBy: { [sortBy]: sortOrder },
                include: {
                    user: { select: { id: true, name: true, email: true, profileImage: true } },
                    _count: { select: { comments: true } }
                }
            }),
            prisma_1.default.communityPost.count({ where })
        ]);
        const transformedPosts = posts.map(post => ({
            id: post.id, postContent: post.postContent, postDate: post.postDate,
            updatedAt: post.updatedAt,
            user: {
                id: post.user.id, name: post.user.name, email: post.user.email,
                profileImage: post.user.profileImage || undefined,
            },
            commentCount: post._count.comments,
        }));
        const totalPages = Math.ceil(total / limit);
        const response = {
            data: transformedPosts,
            meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 }
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async getPostById(postId) {
        const cacheKey = `community:post:${postId}`;
        const cached = await redis_cache_service_1.default.getFast(cacheKey);
        if (cached)
            return cached;
        const post = await prisma_1.default.communityPost.findFirst({
            where: { id: postId },
            include: {
                user: { select: { id: true, name: true, email: true, profileImage: true } },
                comments: {
                    orderBy: { createdAt: 'asc' },
                    include: { user: { select: { id: true, name: true, profileImage: true } } }
                },
                _count: { select: { comments: true } }
            }
        });
        if (!post)
            throw new Error('Post not found');
        const formattedComments = post.comments.map(comment => ({
            id: comment.id, content: comment.content, createdAt: comment.createdAt,
            user: {
                id: comment.user.id, name: comment.user.name,
                profileImage: comment.user.profileImage || undefined,
            },
        }));
        const response = {
            id: post.id, postContent: post.postContent, postDate: post.postDate,
            updatedAt: post.updatedAt,
            user: {
                id: post.user.id, name: post.user.name, email: post.user.email,
                profileImage: post.user.profileImage || undefined,
            },
            commentCount: post._count.comments,
            comments: formattedComments,
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 300);
        return response;
    }
    static async deletePost(userId, postId, isAdmin = false) {
        const where = { id: postId };
        if (!isAdmin)
            where.userId = userId;
        const existingPost = await prisma_1.default.communityPost.findFirst({ where, select: { id: true } });
        if (!existingPost)
            throw new Error('Post not found or unauthorized');
        await prisma_1.default.communityPost.delete({ where: { id: postId } });
        await Promise.all([
            redis_cache_service_1.default.delPattern('community:posts:*'),
            redis_cache_service_1.default.del(`community:post:${postId}`)
        ]);
        return { message: 'Post deleted successfully' };
    }
    static async createComment(userId, postId, data) {
        const post = await prisma_1.default.communityPost.findFirst({ where: { id: postId }, select: { id: true, userId: true } });
        if (!post)
            throw new Error('Post not found');
        const comment = await prisma_1.default.communityComment.create({
            data: { postId, userId, content: data.content },
            include: { user: { select: { id: true, name: true, profileImage: true } } }
        });
        const response = {
            id: comment.id, content: comment.content, createdAt: comment.createdAt,
            user: {
                id: comment.user.id, name: comment.user.name,
                profileImage: comment.user.profileImage || undefined,
            },
        };
        const commenter = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: { name: true }
        });
        if (post.userId !== userId) {
            await socket_service_1.default.sendCommentNotification(post.userId, postId, commenter?.name || 'Someone');
        }
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
        if (cached)
            return cached;
        const page = queryParams.page || 1;
        const limit = Math.min(50, queryParams.limit || 20);
        const skip = (page - 1) * limit;
        const sortBy = queryParams.sortBy || 'createdAt';
        const sortOrder = queryParams.sortOrder || 'asc';
        const where = { postId };
        if (queryParams.userId)
            where.userId = queryParams.userId;
        const [comments, total] = await Promise.all([
            prisma_1.default.communityComment.findMany({
                where, skip, take: limit, orderBy: { [sortBy]: sortOrder },
                include: { user: { select: { id: true, name: true, profileImage: true } } }
            }),
            prisma_1.default.communityComment.count({ where })
        ]);
        const transformedComments = comments.map(comment => ({
            id: comment.id, content: comment.content, createdAt: comment.createdAt,
            user: {
                id: comment.user.id, name: comment.user.name,
                profileImage: comment.user.profileImage || undefined,
            },
        }));
        const totalPages = Math.ceil(total / limit);
        const response = {
            data: transformedComments,
            meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 }
        };
        await redis_cache_service_1.default.setFast(cacheKey, response, 120);
        return response;
    }
    static async deleteComment(userId, commentId, isAdmin = false) {
        const where = { id: commentId };
        if (!isAdmin)
            where.userId = userId;
        const comment = await prisma_1.default.communityComment.findFirst({ where, select: { postId: true } });
        if (!comment)
            throw new Error('Comment not found or unauthorized');
        const postId = comment.postId;
        await prisma_1.default.communityComment.delete({ where: { id: commentId } });
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
        if (cached)
            return cached;
        const paramsWithUser = { ...queryParams, userId };
        const result = await this.getAllPosts(paramsWithUser);
        await redis_cache_service_1.default.setFast(cacheKey, result, 120);
        return result;
    }
}
exports.CommunityService = CommunityService;
//# sourceMappingURL=community.service.js.map