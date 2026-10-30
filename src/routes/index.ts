import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import schemeRoutes from '../modules/schemes/scheme.routes';
import schemeVersionRoutes from '../modules/scheme-versions/scheme-version.routes';
import eligibilityRuleRoutes from '../modules/eligibility-rules/eligibility-rule.routes';
import auditLogRoutes from '../modules/audit-logs/audit-log.routes';
import reviewCommentRoutes from '../modules/review-comments/review-comment.routes';
import reviewFlagRoutes from '../modules/review-flags/review-flag.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/schemes', schemeRoutes);
router.use('/schemes/:schemeId/versions', schemeVersionRoutes);
router.use('/eligibility-rules', eligibilityRuleRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/review-comments', reviewCommentRoutes);
router.use('/review-flags', reviewFlagRoutes);

export default router;
