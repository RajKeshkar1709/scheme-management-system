import { Router } from 'express';
import { ReviewFlagController } from './review-flag.controller';
import { authenticate } from '../../middlewares/authenticate.middleware';

const router = Router();

router.use(authenticate);

router.get('/', ReviewFlagController.listFlags);
router.patch('/:id/resolve', ReviewFlagController.resolveFlag);

export default router;
