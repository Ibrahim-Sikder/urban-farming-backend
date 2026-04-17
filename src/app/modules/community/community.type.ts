// modules/community/community.type.ts

export interface CreatePostInput {
    postContent: string;
}

export interface UpdatePostInput {
    postContent?: string;
}

export interface CreateCommentInput {
    content: string;
}

export interface PostFilters {
    search?: string;
    page?: number;
    limit?: number;
}

export interface PostResponse {
    id: number;
    postContent: string;
    postDate: Date;
    updatedAt: Date;
    user: {
        id: number;
        name: string;
        email: string;
        profileImage?: string;
    };
    commentCount: number;
}

export interface CommentResponse {
    id: number;
    content: string;
    createdAt: Date;
    user: {
        id: number;
        name: string;
        profileImage?: string;
    };
}

export interface PaginatedPostsResponse {
    posts: PostResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}