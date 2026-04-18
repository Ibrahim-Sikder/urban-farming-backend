import prisma from '../../config/prisma';
import RedisCacheService from '../../services/redis-cache.service';
import socketService from '../../services/socket.service';
import {
    CreatePostInput,
    UpdatePostInput,
    CreateCommentInput,
    PostQueryParams,
    CommentQueryParams,
    PostResponse,
    CommentResponse,
    PostWithCommentsResponse,
    PaginatedResponse
} from './community.type';

export class CommunityService {

    static async createPost(userId: number, data: CreatePostInput): Promise<PostResponse> {
        const post = await prisma.communityPost.create({
            data: { userId, postContent: data.postContent },
            include: {
                user: { select: { id: true, name: true, email: true, profileImage: true } }
            }
        });

        const response: PostResponse = {
            id: post.id, postContent: post.postContent, postDate: post.postDate,
            updatedAt: post.updatedAt,
            user: {
                id: post.user.id, name: post.user.name, email: post.user.email,
                profileImage: post.user.profileImage || undefined,
            },
            commentCount: 0,
        };

        await RedisCacheService.delPattern('community:posts:*');
        return response;
    }

    static async updatePost(userId: number, postId: number, data: UpdatePostInput): Promise<PostResponse> {
        const existingPost = await prisma.communityPost.findFirst({
            where: { id: postId, userId }, select: { id: true }
        });

        if (!existingPost) throw new Error('Post not found or unauthorized');

        const updatedPost = await prisma.communityPost.update({
            where: { id: postId },
            data: { postContent: data.postContent },
            include: {
                user: { select: { id: true, name: true, email: true, profileImage: true } }
            }
        });

        const commentCount = await prisma.communityComment.count({ where: { postId } });

        const response: PostResponse = {
            id: updatedPost.id, postContent: updatedPost.postContent,
            postDate: updatedPost.postDate, updatedAt: updatedPost.updatedAt,
            user: {
                id: updatedPost.user.id, name: updatedPost.user.name,
                email: updatedPost.user.email, profileImage: updatedPost.user.profileImage || undefined,
            },
            commentCount,
        };

        await Promise.all([
            RedisCacheService.delPattern('community:posts:*'),
            RedisCacheService.del(`community:post:${postId}`)
        ]);

        return response;
    }

    static async getAllPosts(queryParams: PostQueryParams = {}): Promise<PaginatedResponse<PostResponse>> {
        const cacheKey = `community:posts:${JSON.stringify(queryParams)}`;
        const cached = await RedisCacheService.getFast<PaginatedResponse<PostResponse>>(cacheKey);
        if (cached) return cached;

        const page = queryParams.page || 1;
        const limit = Math.min(50, queryParams.limit || 10);
        const skip = (page - 1) * limit;
        const sortBy = queryParams.sortBy || 'postDate';
        const sortOrder = queryParams.sortOrder || 'desc';

        const where: any = {};
        if (queryParams.searchTerm) where.postContent = { contains: queryParams.searchTerm, mode: 'insensitive' };
        if (queryParams.userId) where.userId = queryParams.userId;
        if (queryParams.dateFrom || queryParams.dateTo) {
            where.postDate = {};
            if (queryParams.dateFrom) where.postDate.gte = queryParams.dateFrom;
            if (queryParams.dateTo) where.postDate.lte = queryParams.dateTo;
        }

        const [posts, total] = await Promise.all([
            prisma.communityPost.findMany({
                where, skip, take: limit, orderBy: { [sortBy]: sortOrder },
                include: {
                    user: { select: { id: true, name: true, email: true, profileImage: true } },
                    _count: { select: { comments: true } }
                }
            }),
            prisma.communityPost.count({ where })
        ]);

        const transformedPosts: PostResponse[] = posts.map(post => ({
            id: post.id, postContent: post.postContent, postDate: post.postDate,
            updatedAt: post.updatedAt,
            user: {
                id: post.user.id, name: post.user.name, email: post.user.email,
                profileImage: post.user.profileImage || undefined,
            },
            commentCount: post._count.comments,
        }));

        const totalPages = Math.ceil(total / limit);
        const response: PaginatedResponse<PostResponse> = {
            data: transformedPosts,
            meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 }
        };

        await RedisCacheService.setFast(cacheKey, response, 120);
        return response;
    }

    static async getPostById(postId: number): Promise<PostWithCommentsResponse> {
        const cacheKey = `community:post:${postId}`;
        const cached = await RedisCacheService.getFast<PostWithCommentsResponse>(cacheKey);
        if (cached) return cached;

        const post = await prisma.communityPost.findFirst({
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

        if (!post) throw new Error('Post not found');

        const formattedComments: CommentResponse[] = post.comments.map(comment => ({
            id: comment.id, content: comment.content, createdAt: comment.createdAt,
            user: {
                id: comment.user.id, name: comment.user.name,
                profileImage: comment.user.profileImage || undefined,
            },
        }));

        const response: PostWithCommentsResponse = {
            id: post.id, postContent: post.postContent, postDate: post.postDate,
            updatedAt: post.updatedAt,
            user: {
                id: post.user.id, name: post.user.name, email: post.user.email,
                profileImage: post.user.profileImage || undefined,
            },
            commentCount: post._count.comments,
            comments: formattedComments,
        };

        await RedisCacheService.setFast(cacheKey, response, 300);
        return response;
    }

    static async deletePost(userId: number, postId: number, isAdmin: boolean = false): Promise<{ message: string }> {
        const where: any = { id: postId };
        if (!isAdmin) where.userId = userId;

        const existingPost = await prisma.communityPost.findFirst({ where, select: { id: true } });
        if (!existingPost) throw new Error('Post not found or unauthorized');

        await prisma.communityPost.delete({ where: { id: postId } });

        await Promise.all([
            RedisCacheService.delPattern('community:posts:*'),
            RedisCacheService.del(`community:post:${postId}`)
        ]);

        return { message: 'Post deleted successfully' };
    }

    static async createComment(userId: number, postId: number, data: CreateCommentInput): Promise<CommentResponse> {
        const post = await prisma.communityPost.findFirst({ where: { id: postId }, select: { id: true, userId: true } });
        if (!post) throw new Error('Post not found');

        const comment = await prisma.communityComment.create({
            data: { postId, userId, content: data.content },
            include: { user: { select: { id: true, name: true, profileImage: true } } }
        });

        const response: CommentResponse = {
            id: comment.id, content: comment.content, createdAt: comment.createdAt,
            user: {
                id: comment.user.id, name: comment.user.name,
                profileImage: comment.user.profileImage || undefined,
            },
        };

        const commenter = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true }
        });
        if (post.userId !== userId) {
            await socketService.sendCommentNotification(post.userId, postId, commenter?.name || 'Someone');
        }
        await Promise.all([
            RedisCacheService.delPattern('community:posts:*'),
            RedisCacheService.del(`community:post:${postId}`),
            RedisCacheService.delPattern(`community:comments:${postId}:*`)
        ]);

        return response;
    }

    static async getComments(postId: number, queryParams: CommentQueryParams = {}): Promise<PaginatedResponse<CommentResponse>> {
        const cacheKey = `community:comments:${postId}:${JSON.stringify(queryParams)}`;
        const cached = await RedisCacheService.getFast<PaginatedResponse<CommentResponse>>(cacheKey);
        if (cached) return cached;

        const page = queryParams.page || 1;
        const limit = Math.min(50, queryParams.limit || 20);
        const skip = (page - 1) * limit;
        const sortBy = queryParams.sortBy || 'createdAt';
        const sortOrder = queryParams.sortOrder || 'asc';

        const where: any = { postId };
        if (queryParams.userId) where.userId = queryParams.userId;

        const [comments, total] = await Promise.all([
            prisma.communityComment.findMany({
                where, skip, take: limit, orderBy: { [sortBy]: sortOrder },
                include: { user: { select: { id: true, name: true, profileImage: true } } }
            }),
            prisma.communityComment.count({ where })
        ]);

        const transformedComments: CommentResponse[] = comments.map(comment => ({
            id: comment.id, content: comment.content, createdAt: comment.createdAt,
            user: {
                id: comment.user.id, name: comment.user.name,
                profileImage: comment.user.profileImage || undefined,
            },
        }));

        const totalPages = Math.ceil(total / limit);
        const response: PaginatedResponse<CommentResponse> = {
            data: transformedComments,
            meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 }
        };

        await RedisCacheService.setFast(cacheKey, response, 120);
        return response;
    }

    static async deleteComment(userId: number, commentId: number, isAdmin: boolean = false): Promise<{ message: string }> {
        const where: any = { id: commentId };
        if (!isAdmin) where.userId = userId;

        const comment = await prisma.communityComment.findFirst({ where, select: { postId: true } });
        if (!comment) throw new Error('Comment not found or unauthorized');

        const postId = comment.postId;
        await prisma.communityComment.delete({ where: { id: commentId } });

        await Promise.all([
            RedisCacheService.delPattern('community:posts:*'),
            RedisCacheService.del(`community:post:${postId}`),
            RedisCacheService.delPattern(`community:comments:${postId}:*`)
        ]);

        return { message: 'Comment deleted successfully' };
    }
    static async getUserPosts(userId: number, queryParams: PostQueryParams = {}): Promise<PaginatedResponse<PostResponse>> {
        const cacheKey = `community:user:posts:${userId}:${JSON.stringify(queryParams)}`;
        const cached = await RedisCacheService.getFast<PaginatedResponse<PostResponse>>(cacheKey);
        if (cached) return cached;

        const paramsWithUser = { ...queryParams, userId };
        const result = await this.getAllPosts(paramsWithUser);
        await RedisCacheService.setFast(cacheKey, result, 120);
        return result;
    }

}