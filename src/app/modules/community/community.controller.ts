import { Request, Response } from 'express';
import { CommunityService } from './community.service';
import { ResponseHandler } from '../../shared/utils/response';
import { AuthRequest } from '../../shared/middleware/auth';

export class CommunityController {

    // ============ POST CONTROLLERS ============

    static async createPost(req: AuthRequest, res: Response): Promise<void> {
        try {
            const post = await CommunityService.createPost(req.user!.id, req.body);
            ResponseHandler.success(res, post, 'Post created successfully', 201);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async updatePost(req: AuthRequest, res: Response): Promise<void> {
        try {
            const postId = parseInt(req.params.id);
            const post = await CommunityService.updatePost(req.user!.id, postId, req.body);
            ResponseHandler.success(res, post, 'Post updated successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getAllPosts(req: Request, res: Response): Promise<void> {
        try {
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
                searchTerm: req.query.searchTerm as string,
                userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
            };
            const result = await CommunityService.getAllPosts(queryParams);
            ResponseHandler.success(res, result, 'Posts fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getPostById(req: Request, res: Response): Promise<void> {
        try {
            const postId = parseInt(req.params.id);
            const post = await CommunityService.getPostById(postId);
            ResponseHandler.success(res, post, 'Post fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 404);
        }
    }

    static async deletePost(req: AuthRequest, res: Response): Promise<void> {
        try {
            const postId = parseInt(req.params.id);
            const isAdmin = req.user!.role === 'ADMIN';
            const result = await CommunityService.deletePost(req.user!.id, postId, isAdmin);
            ResponseHandler.success(res, result, 'Post deleted successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getUserPosts(req: AuthRequest, res: Response): Promise<void> {
        try {
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
            };
            const result = await CommunityService.getUserPosts(req.user!.id, queryParams);
            ResponseHandler.success(res, result, 'User posts fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getTrendingPosts(req: Request, res: Response): Promise<void> {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const posts = await CommunityService.getTrendingPosts(limit);
            ResponseHandler.success(res, posts, 'Trending posts fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    // ============ COMMENT CONTROLLERS ============

    static async createComment(req: AuthRequest, res: Response): Promise<void> {
        try {
            const postId = parseInt(req.params.postId);
            const comment = await CommunityService.createComment(req.user!.id, postId, req.body);
            ResponseHandler.success(res, comment, 'Comment added successfully', 201);
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async getComments(req: Request, res: Response): Promise<void> {
        try {
            const postId = parseInt(req.params.postId);
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
                sortBy: req.query.sortBy as string,
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
                userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
            };
            const comments = await CommunityService.getComments(postId, queryParams);
            ResponseHandler.success(res, comments, 'Comments fetched successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }

    static async deleteComment(req: AuthRequest, res: Response): Promise<void> {
        try {
            const commentId = parseInt(req.params.commentId);
            const isAdmin = req.user!.role === 'ADMIN';
            const result = await CommunityService.deleteComment(req.user!.id, commentId, isAdmin);
            ResponseHandler.success(res, result, 'Comment deleted successfully');
        } catch (error: any) {
            ResponseHandler.error(res, error.message, 400);
        }
    }
}