"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityController = void 0;
const community_service_1 = require("./community.service");
const response_1 = require("../../shared/utils/response");
class CommunityController {
    static async createPost(req, res) {
        try {
            const post = await community_service_1.CommunityService.createPost(req.user.id, req.body);
            response_1.ResponseHandler.success(res, post, 'Post created successfully', 201);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async updatePost(req, res) {
        try {
            const postId = parseInt(req.params.id);
            const post = await community_service_1.CommunityService.updatePost(req.user.id, postId, req.body);
            response_1.ResponseHandler.success(res, post, 'Post updated successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getAllPosts(req, res) {
        try {
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
                searchTerm: req.query.searchTerm,
                userId: req.query.userId ? parseInt(req.query.userId) : undefined,
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
            };
            const result = await community_service_1.CommunityService.getAllPosts(queryParams);
            response_1.ResponseHandler.success(res, result, 'Posts fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getPostById(req, res) {
        try {
            const postId = parseInt(req.params.id);
            const post = await community_service_1.CommunityService.getPostById(postId);
            response_1.ResponseHandler.success(res, post, 'Post fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 404);
        }
    }
    static async deletePost(req, res) {
        try {
            const postId = parseInt(req.params.id);
            const isAdmin = req.user.role === 'ADMIN';
            const result = await community_service_1.CommunityService.deletePost(req.user.id, postId, isAdmin);
            response_1.ResponseHandler.success(res, result, 'Post deleted successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getUserPosts(req, res) {
        try {
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'desc',
            };
            const result = await community_service_1.CommunityService.getUserPosts(req.user.id, queryParams);
            response_1.ResponseHandler.success(res, result, 'User posts fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async createComment(req, res) {
        try {
            const postId = parseInt(req.params.postId);
            const comment = await community_service_1.CommunityService.createComment(req.user.id, postId, req.body);
            response_1.ResponseHandler.success(res, comment, 'Comment added successfully', 201);
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async getComments(req, res) {
        try {
            const postId = parseInt(req.params.postId);
            const queryParams = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 20,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder || 'asc',
                userId: req.query.userId ? parseInt(req.query.userId) : undefined,
            };
            const comments = await community_service_1.CommunityService.getComments(postId, queryParams);
            response_1.ResponseHandler.success(res, comments, 'Comments fetched successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
    static async deleteComment(req, res) {
        try {
            const commentId = parseInt(req.params.commentId);
            const isAdmin = req.user.role === 'ADMIN';
            const result = await community_service_1.CommunityService.deleteComment(req.user.id, commentId, isAdmin);
            response_1.ResponseHandler.success(res, result, 'Comment deleted successfully');
        }
        catch (error) {
            response_1.ResponseHandler.error(res, error.message, 400);
        }
    }
}
exports.CommunityController = CommunityController;
//# sourceMappingURL=community.controller.js.map