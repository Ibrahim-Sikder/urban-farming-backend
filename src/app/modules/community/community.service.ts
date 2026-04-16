// modules/community/community.service.ts
import prisma from '../../config/prisma';
import {
    CreatePostInput,
    UpdatePostInput,
    CreateCommentInput,
    PostFilters,
    PostResponse,
    PaginatedPostsResponse
} from './community.type';

export class CommunityService {

    // ============ POST MANAGEMENT ============

    static async createPost(userId: number, data: CreatePostInput): Promise<PostResponse> {
        const post = await prisma.communityPost.create({
            data: {
                userId,
                title: data.title,
                content: data.content,
                images: data.images || [],
                tags: data.tags || [],
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                        role: true,
                    }
                },
                comments: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                profileImage: true,
                            }
                        }
                    }
                }
            }
        });

        await prisma.auditLog.create({
            data: {
                userId,
                action: 'CREATE_POST',
                entity: 'CommunityPost',
                entityId: post.id,
            },
        });

        return {
            ...post,
            commentCount: post.comments.length,
        } as PostResponse;
    }

    static async updatePost(userId: number, postId: number, data: UpdatePostInput): Promise<PostResponse> {
        const post = await prisma.communityPost.findFirst({
            where: {
                id: postId,
                userId,
            }
        });

        if (!post) {
            throw new Error('Post not found or unauthorized');
        }

        const updated = await prisma.communityPost.update({
            where: { id: postId },
            data: {
                title: data.title,
                content: data.content,
                images: data.images,
                tags: data.tags,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                        role: true,
                    }
                },
                comments: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                profileImage: true,
                            }
                        }
                    }
                }
            }
        });

        return {
            ...updated,
            commentCount: updated.comments.length,
        } as PostResponse;
    }

    static async getAllPosts(filters: PostFilters): Promise<PaginatedPostsResponse> {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;

        const where: any = { isApproved: true };

        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { content: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        if (filters.tags) {
            where.tags = { has: filters.tags };
        }

        let orderBy: any = { createdAt: 'desc' };

        if (filters.sortBy === 'popular') {
            orderBy = { likes: 'desc' };
        } else if (filters.sortBy === 'trending') {
            orderBy = [
                { likes: 'desc' },
                { viewCount: 'desc' },
                { createdAt: 'desc' }
            ];
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
                            profileImage: true,
                            role: true,
                        }
                    },
                    comments: {
                        take: 3,
                        orderBy: { createdAt: 'desc' },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    profileImage: true,
                                }
                            }
                        }
                    },
                    _count: {
                        select: { comments: true }
                    }
                },
                orderBy,
            }),
            prisma.communityPost.count({ where }),
        ]);

        // Increment view count for each post (async, don't await)
        posts.forEach(post => {
            prisma.communityPost.update({
                where: { id: post.id },
                data: { viewCount: { increment: 1 } }
            }).catch(() => { });
        });

        return {
            posts: posts.map(post => ({
                ...post,
                commentCount: post._count.comments,
            })) as PostResponse[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    static async getPostById(postId: number): Promise<PostResponse> {
        const post = await prisma.communityPost.findFirst({
            where: {
                id: postId,
                isApproved: true,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                        role: true,
                    }
                },
                comments: {
                    where: { parentId: null },
                    orderBy: { createdAt: 'asc' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                profileImage: true,
                            }
                        },
                        _count: {
                            select: { replies: true }
                        },
                        replies: {
                            take: 10,
                            orderBy: { createdAt: 'asc' },
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        profileImage: true,
                                    }
                                }
                            }
                        }
                    }
                },
                _count: {
                    select: { comments: true }
                }
            }
        });

        if (!post) {
            throw new Error('Post not found');
        }

        // Increment view count
        await prisma.communityPost.update({
            where: { id: postId },
            data: { viewCount: { increment: 1 } }
        });

        return {
            ...post,
            commentCount: post._count.comments,
        } as PostResponse;
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

        await prisma.communityPost.delete({ where: { id: postId } });

        await prisma.auditLog.create({
            data: {
                userId,
                action: 'DELETE_POST',
                entity: 'CommunityPost',
                entityId: postId,
            },
        });

        return { message: 'Post deleted successfully' };
    }

    // ============ POST INTERACTIONS ============

    static async likePost(userId: number, postId: number): Promise<{ likes: number }> {
        const post = await prisma.communityPost.findFirst({
            where: { id: postId, isApproved: true }
        });

        if (!post) {
            throw new Error('Post not found');
        }

        // Check if already liked (simplified - you'd want a separate Like table)
        const updated = await prisma.communityPost.update({
            where: { id: postId },
            data: { likes: { increment: 1 } }
        });

        await prisma.notification.create({
            data: {
                userId: post.userId,
                title: 'Post Liked',
                message: `Someone liked your post "${post.title.substring(0, 50)}"`,
                type: 'SYSTEM',
            },
        });

        return { likes: updated.likes };
    }

    static async unlikePost(userId: number, postId: number): Promise<{ likes: number }> {
        const post = await prisma.communityPost.findFirst({
            where: { id: postId, isApproved: true }
        });

        if (!post) {
            throw new Error('Post not found');
        }

        const updated = await prisma.communityPost.update({
            where: { id: postId },
            data: { likes: { decrement: 1 } }
        });

        return { likes: updated.likes };
    }

    static async sharePost(userId: number, postId: number): Promise<{ shares: number }> {
        const post = await prisma.communityPost.findFirst({
            where: { id: postId, isApproved: true }
        });

        if (!post) {
            throw new Error('Post not found');
        }

        const updated = await prisma.communityPost.update({
            where: { id: postId },
            data: { shares: { increment: 1 } }
        });

        return { shares: updated.shares };
    }

    // ============ COMMENT MANAGEMENT ============

    static async createComment(userId: number, postId: number, data: CreateCommentInput): Promise<any> {
        const post = await prisma.communityPost.findFirst({
            where: { id: postId, isApproved: true }
        });

        if (!post) {
            throw new Error('Post not found');
        }

        const comment = await prisma.communityComment.create({
            data: {
                postId,
                userId,
                content: data.content,
                parentId: data.parentId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profileImage: true,
                    }
                }
            }
        });

        await prisma.notification.create({
            data: {
                userId: post.userId,
                title: 'New Comment',
                message: `Someone commented on your post "${post.title.substring(0, 50)}"`,
                type: 'SYSTEM',
            },
        });

        return comment;
    }

    static async getComments(postId: number, page: number = 1, limit: number = 20): Promise<any> {
        const skip = (page - 1) * limit;

        const [comments, total] = await Promise.all([
            prisma.communityComment.findMany({
                where: {
                    postId,
                    parentId: null,
                },
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            profileImage: true,
                        }
                    },
                    replies: {
                        take: 10,
                        orderBy: { createdAt: 'asc' },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    profileImage: true,
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'asc' },
            }),
            prisma.communityComment.count({
                where: { postId, parentId: null }
            }),
        ]);

        return {
            comments,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    static async deleteComment(userId: number, commentId: number, isAdmin: boolean = false): Promise<{ message: string }> {
        const where: any = { id: commentId };

        if (!isAdmin) {
            where.userId = userId;
        }

        const comment = await prisma.communityComment.findFirst({ where });

        if (!comment) {
            throw new Error('Comment not found or unauthorized');
        }

        await prisma.communityComment.delete({ where: { id: commentId } });

        return { message: 'Comment deleted successfully' };
    }

    static async likeComment(userId: number, commentId: number): Promise<{ likes: number }> {
        const updated = await prisma.communityComment.update({
            where: { id: commentId },
            data: { likes: { increment: 1 } }
        });

        return { likes: updated.likes };
    }

    // ============ ADMIN OPERATIONS ============

    static async moderatePost(adminId: number, postId: number, isApproved: boolean, rejectionReason?: string): Promise<any> {
        const post = await prisma.communityPost.update({
            where: { id: postId },
            data: {
                isApproved,
                approvedBy: adminId,
                approvedAt: new Date(),
            }
        });

        await prisma.notification.create({
            data: {
                userId: post.userId,
                title: isApproved ? 'Post Approved' : 'Post Rejected',
                message: isApproved
                    ? 'Your post has been approved and is now visible'
                    : `Your post was rejected. Reason: ${rejectionReason || 'Content policy violation'}`,
                type: 'SYSTEM',
            },
        });

        return post;
    }

    static async pinPost(adminId: number, postId: number, isPinned: boolean): Promise<any> {
        const post = await prisma.communityPost.update({
            where: { id: postId },
            data: { isPinned }
        });

        return post;
    }
}