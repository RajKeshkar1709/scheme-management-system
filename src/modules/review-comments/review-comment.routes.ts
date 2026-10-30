import { Router } from 'express';
import { ReviewCommentController } from './review-comment.controller';
import { authenticate } from '../../middlewares/authenticate.middleware';

const router = Router();

router.use(authenticate);

router.get('/versions/:versionId/comments', ReviewCommentController.getCommentsByVersion);

export default router;
