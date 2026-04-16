// modules/community/community.type.ts

// ============ INPUT TYPES ============
export interface CreatePostInput {
    title: string;
    content: string;
    images?: string[];
    tags?: string[];
}

export interface UpdatePostInput {
    title?: string;
    content?: string;
    images?: string[];
    tags?: string[];
}

export interface CreateCommentInput {
    content: string;
    parentId?: number;
}

export interface PostFilters {
    search?: string;
    tags?: string;
    sortBy?: 'latest' | 'popular' | 'trending';
    page?: number;
    limit?: number;
}

// ============ RESPONSE TYPES ============
export interface PostResponse {
    id: number;
    title: string;
    content: string;
    images: string[];
    tags: string[];
    likes: number;
    shares: number;
    isPinned: boolean;
    viewCount: number;
    user: {
        id: number;
        name: string;
        profileImage?: string;
        role: string;
    };
    comments: CommentResponse[];
    commentCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CommentResponse {
    id: number;
    content: string;
    likes: number;
    user: {
        id: number;
        name: string;
        profileImage?: string;
    };
    replies?: CommentResponse[];
    createdAt: Date;
}

export interface PaginatedPostsResponse {
    posts: PostResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}