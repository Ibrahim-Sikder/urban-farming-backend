"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityService = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
class CommunityService {
    static async createPost(userId, data) {
        const post = await prisma_1.default.communityPost.create({
            data: {
                userId,
                postContent: data.postContent,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profileImage: true,
                    }
                }
            }
        });
        return {
            id: post.id,
            postContent: post.postContent,
            postDate: post.postDate,
            updatedAt: post.updatedAt,
            user: post.user,
            commentCount: 0,
        };
    }
    static async updatePost(userId, postId, data) {
        const post = await prisma_1.default.communityPost.findFirst({
            where: { id: postId, userId },
        });
        if (!post) {
            throw new Error('Post not found or unauthorized');
        }
        const updated = await prisma_1.default.communityPost.update({
            where: { id: postId },
            data: {
                postContent: data.postContent,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profileImage: true,
                    }
                }
            }
        });
        const commentCount = await prisma_1.default.$queryRaw `
            SELECT COUNT(*) FROM "CommunityComment" WHERE "postId" = ${postId}
        `;
        return {
            id: updated.id,
            postContent: updated.postContent,
            postDate: updated.postDate,
            updatedAt: updated.updatedAt,
            user: updated.user,
            commentCount: Number(commentCount[0]?.count) || 0,
        };
    }
    static async getAllPosts(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.search) {
            where.postContent = { contains: filters.search, mode: 'insensitive' };
        }
        const [posts, total] = await Promise.all([
            prisma_1.default.communityPost.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profileImage: true,
                        }
                    }
                },
                orderBy: { postDate: 'desc' },
            }),
            prisma_1.default.communityPost.count({ where }),
        ]);
        const postsWithCounts = await Promise.all(posts.map(async (post) => {
            const commentCount = await prisma_1.default.$queryRaw `
                    SELECT COUNT(*) FROM "CommunityComment" WHERE "postId" = ${post.id}
                `;
            return {
                id: post.id,
                postContent: post.postContent,
                postDate: post.postDate,
                updatedAt: post.updatedAt,
                user: post.user,
                commentCount: Number(commentCount[0]?.count) || 0,
            };
        }));
        return {
            posts: postsWithCounts,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async getPostById(postId) {
        const post = await prisma_1.default.communityPost.findFirst({
            where: { id: postId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profileImage: true,
                    }
                }
            }
        });
        if (!post) {
            throw new Error('Post not found');
        }
        const comments = await prisma_1.default.$queryRaw `
            SELECT cc.id, cc.content, cc."createdAt", 
                   u.id as user_id, u.name as user_name, u."profileImage" as user_profileImage
            FROM "CommunityComment" cc
            JOIN "User" u ON cc."userId" = u.id
            WHERE cc."postId" = ${postId}
            ORDER BY cc."createdAt" ASC
        `;
        const commentCount = await prisma_1.default.$queryRaw `
            SELECT COUNT(*) FROM "CommunityComment" WHERE "postId" = ${postId}
        `;
        const formattedComments = comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            user: {
                id: comment.user_id,
                name: comment.user_name,
                profileImage: comment.user_profileImage,
            },
        }));
        return {
            id: post.id,
            postContent: post.postContent,
            postDate: post.postDate,
            updatedAt: post.updatedAt,
            user: post.user,
            commentCount: Number(commentCount[0]?.count) || 0,
            comments: formattedComments,
        };
    }
    static async deletePost(userId, postId, isAdmin = false) {
        const where = { id: postId };
        if (!isAdmin) {
            where.userId = userId;
        }
        const post = await prisma_1.default.communityPost.findFirst({ where });
        if (!post) {
            throw new Error('Post not found or unauthorized');
        }
        await prisma_1.default.$executeRaw `DELETE FROM "CommunityComment" WHERE "postId" = ${postId}`;
        await prisma_1.default.communityPost.delete({ where: { id: postId } });
        return { message: 'Post deleted successfully' };
    }
    static async createComment(userId, postId, data) {
        const post = await prisma_1.default.communityPost.findFirst({
            where: { id: postId }
        });
        if (!post) {
            throw new Error('Post not found');
        }
        const comment = await prisma_1.default.$executeRaw `
            INSERT INTO "CommunityComment" ("postId", "userId", content, "createdAt")
            VALUES (${postId}, ${userId}, ${data.content}, NOW())
            RETURNING id, content, "createdAt"
        `;
        const commentResult = await prisma_1.default.$queryRaw `
            SELECT cc.id, cc.content, cc."createdAt", 
                   u.id as user_id, u.name as user_name, u."profileImage" as user_profileImage
            FROM "CommunityComment" cc
            JOIN "User" u ON cc."userId" = u.id
            WHERE cc."postId" = ${postId} AND cc."userId" = ${userId}
            ORDER BY cc."createdAt" DESC
            LIMIT 1
        `;
        const newComment = commentResult[0];
        return {
            id: newComment.id,
            content: newComment.content,
            createdAt: newComment.createdAt,
            user: {
                id: newComment.user_id,
                name: newComment.user_name,
                profileImage: newComment.user_profileImage,
            },
        };
    }
    static async getComments(postId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [comments, total] = await Promise.all([
            prisma_1.default.$queryRaw `
                SELECT cc.id, cc.content, cc."createdAt", 
                       u.id as user_id, u.name as user_name, u."profileImage" as user_profileImage
                FROM "CommunityComment" cc
                JOIN "User" u ON cc."userId" = u.id
                WHERE cc."postId" = ${postId}
                ORDER BY cc."createdAt" ASC
                LIMIT ${limit} OFFSET ${skip}
            `,
            prisma_1.default.$queryRaw `
                SELECT COUNT(*) as count FROM "CommunityComment" WHERE "postId" = ${postId}
            `,
        ]);
        const formattedComments = comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            user: {
                id: comment.user_id,
                name: comment.user_name,
                profileImage: comment.user_profileImage,
            },
        }));
        return {
            comments: formattedComments,
            total: Number(total[0]?.count) || 0,
            page,
            limit,
            totalPages: Math.ceil(Number(total[0]?.count) / limit),
        };
    }
    static async deleteComment(userId, commentId, isAdmin = false) {
        const whereClause = isAdmin
            ? `id = ${commentId}`
            : `id = ${commentId} AND "userId" = ${userId}`;
        const comment = await prisma_1.default.$queryRaw `
            SELECT id FROM "CommunityComment" WHERE ${whereClause}
        `;
        if (comment.length === 0) {
            throw new Error('Comment not found or unauthorized');
        }
        await prisma_1.default.$executeRaw `DELETE FROM "CommunityComment" WHERE id = ${commentId}`;
        return { message: 'Comment deleted successfully' };
    }
}
exports.CommunityService = CommunityService;
//# sourceMappingURL=community.service.js.map