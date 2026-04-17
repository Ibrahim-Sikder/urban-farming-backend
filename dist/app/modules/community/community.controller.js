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
            const filters = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                search: req.query.search,
            };
            const result = await community_service_1.CommunityService.getAllPosts(filters);
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
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const comments = await community_service_1.CommunityService.getComments(postId, page, limit);
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