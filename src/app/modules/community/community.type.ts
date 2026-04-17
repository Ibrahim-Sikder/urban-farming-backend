import { PaginationParams } from '../../shared/types/common.types';

export interface CreatePostInput {
    postContent: string;
}

export interface UpdatePostInput {
    postContent?: string;
}

export interface CreateCommentInput {
    content: string;
}

export interface PostQueryParams extends PaginationParams {
    userId?: number;
    dateFrom?: Date;
    dateTo?: Date;
}

export interface CommentQueryParams extends PaginationParams {
    userId?: number;
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

export interface PostWithCommentsResponse extends PostResponse {
    comments: CommentResponse[];
}

// Re-export common paginated response
export { PaginatedResponse } from '../../shared/types/common.types';