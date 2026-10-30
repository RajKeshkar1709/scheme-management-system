import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middlewares/authenticate.middleware';

const router = Router();

router.use(authenticate);
router.get('/', UserController.listUsers);
router.get('/:id', UserController.getUserById);

export default router;
