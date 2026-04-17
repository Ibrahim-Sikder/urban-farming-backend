// modules/community/community.service.ts
import prisma from '../../config/prisma';
import {
    CreatePostInput,
    UpdatePostInput,
    CreateCommentInput,
    PostFilters,
    PostResponse,
    PaginatedPostsResponse,
    CommentResponse
} from './community.type';

export class CommunityService {

    // ============ POST MANAGEMENT ============

    static async createPost(userId: number, data: CreatePostInput): Promise<PostResponse> {
        const post = await prisma.communityPost.create({
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

    static async updatePost(userId: number, postId: number, data: UpdatePostInput): Promise<PostResponse> {
        const post = await prisma.communityPost.findFirst({
            where: { id: postId, userId },
        });

        if (!post) {
            throw new Error('Post not found or unauthorized');
        }

        const updated = await prisma.communityPost.update({
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

        const commentCount = await prisma.$queryRaw`
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

    static async getAllPosts(filters: PostFilters): Promise<PaginatedPostsResponse> {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (filters.search) {
            where.postContent = { contains: filters.search, mode: 'insensitive' };
        }

        const [posts, total] = await Promise.all([
            prisma.communityPost.findMany({
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
            prisma.communityPost.count({ where }),
        ]);

        // Get comment counts for each post
        const postsWithCounts = await Promise.all(
            posts.map(async (post) => {
                const commentCount = await prisma.$queryRaw`
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
            })
        );

        return {
            posts: postsWithCounts,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    static async getPostById(postId: number): Promise<PostResponse & { comments: CommentResponse[] }> {
        const post = await prisma.communityPost.findFirst({
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

        const comments = await prisma.$queryRaw`
            SELECT cc.id, cc.content, cc."createdAt", 
                   u.id as user_id, u.name as user_name, u."profileImage" as user_profileImage
            FROM "CommunityComment" cc
            JOIN "User" u ON cc."userId" = u.id
            WHERE cc."postId" = ${postId}
            ORDER BY cc."createdAt" ASC
        `;

        const commentCount = await prisma.$queryRaw`
            SELECT COUNT(*) FROM "CommunityComment" WHERE "postId" = ${postId}
        `;

        const formattedComments = (comments as any[]).map(comment => ({
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

    static async deletePost(userId: number, postId: number, isAdmin: boolean = false): Promise<{ message: string }> {
        const where: any = { id: postId };

        if (!isAdmin) {
            where.userId = userId;
        }

        const post = await prisma.communityPost.findFirst({ where });

        if (!post) {
            throw new Error('Post not found or unauthorized');
        }

        // Delete all comments first
        await prisma.$executeRaw`DELETE FROM "CommunityComment" WHERE "postId" = ${postId}`;

        // Delete the post
        await prisma.communityPost.delete({ where: { id: postId } });

        return { message: 'Post deleted successfully' };
    }

    // ============ COMMENT MANAGEMENT ============

    static async createComment(userId: number, postId: number, data: CreateCommentInput): Promise<CommentResponse> {
        const post = await prisma.communityPost.findFirst({
            where: { id: postId }
        });

        if (!post) {
            throw new Error('Post not found');
        }

        const comment = await prisma.$executeRaw`
            INSERT INTO "CommunityComment" ("postId", "userId", content, "createdAt")
            VALUES (${postId}, ${userId}, ${data.content}, NOW())
            RETURNING id, content, "createdAt"
        `;

        const commentResult = await prisma.$queryRaw`
            SELECT cc.id, cc.content, cc."createdAt", 
                   u.id as user_id, u.name as user_name, u."profileImage" as user_profileImage
            FROM "CommunityComment" cc
            JOIN "User" u ON cc."userId" = u.id
            WHERE cc."postId" = ${postId} AND cc."userId" = ${userId}
            ORDER BY cc."createdAt" DESC
            LIMIT 1
        `;

        const newComment = (commentResult as any[])[0];

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

    static async getComments(postId: number, page: number = 1, limit: number = 20): Promise<any> {
        const skip = (page - 1) * limit;

        const [comments, total] = await Promise.all([
            prisma.$queryRaw`
                SELECT cc.id, cc.content, cc."createdAt", 
                       u.id as user_id, u.name as user_name, u."profileImage" as user_profileImage
                FROM "CommunityComment" cc
                JOIN "User" u ON cc."userId" = u.id
                WHERE cc."postId" = ${postId}
                ORDER BY cc."createdAt" ASC
                LIMIT ${limit} OFFSET ${skip}
            `,
            prisma.$queryRaw`
                SELECT COUNT(*) as count FROM "CommunityComment" WHERE "postId" = ${postId}
            `,
        ]);

        const formattedComments = (comments as any[]).map(comment => ({
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
            total: Number((total as any[])[0]?.count) || 0,
            page,
            limit,
            totalPages: Math.ceil(Number((total as any[])[0]?.count) / limit),
        };
    }

    static async deleteComment(userId: number, commentId: number, isAdmin: boolean = false): Promise<{ message: string }> {
        const whereClause = isAdmin
            ? `id = ${commentId}`
            : `id = ${commentId} AND "userId" = ${userId}`;

        const comment = await prisma.$queryRaw`
            SELECT id FROM "CommunityComment" WHERE ${whereClause}
        `;

        if ((comment as any[]).length === 0) {
            throw new Error('Comment not found or unauthorized');
        }

        await prisma.$executeRaw`DELETE FROM "CommunityComment" WHERE id = ${commentId}`;

        return { message: 'Comment deleted successfully' };
    }
}