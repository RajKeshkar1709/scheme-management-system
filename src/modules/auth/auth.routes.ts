import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller';
import { registerSchema, loginSchema } from './auth.validation';
import { validateRequest } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/authenticate.middleware';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    error: 'TOO_MANY_REQUESTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/register',
  authLimiter,
  validateRequest({ body: registerSchema }),
  AuthController.register,
);

router.post('/login', authLimiter, validateRequest({ body: loginSchema }), AuthController.login);

router.get('/me', authenticate, AuthController.getMe);

export default router;
