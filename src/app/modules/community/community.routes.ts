// modules/community/community.routes.ts
import { Router } from 'express';
import { CommunityController } from './community.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import {
    createPostSchema,
    updatePostSchema,
    createCommentSchema,
    postFiltersSchema,
} from './community.validation';
import { authenticate } from '../../shared/middleware/auth';

const router = Router();

// ============ PUBLIC ROUTES ============
router.get('/posts', validate(postFiltersSchema), CommunityController.getAllPosts);
router.get('/posts/:id', CommunityController.getPostById);
router.get('/posts/:postId/comments', CommunityController.getComments);

// ============ PROTECTED ROUTES ============
router.use(authenticate);

// Post Routes
router.post('/posts', validate(createPostSchema), CommunityController.createPost);
router.put('/posts/:id', validate(updatePostSchema), CommunityController.updatePost);
router.delete('/posts/:id', CommunityController.deletePost);

// Comment Routes
router.post('/posts/:postId/comments', validate(createCommentSchema), CommunityController.createComment);
router.delete('/comments/:commentId', CommunityController.deleteComment);

export const communityRoutes = router;