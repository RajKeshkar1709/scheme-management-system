import { Router } from 'express';
import { SchemeController } from './scheme.controller';
import {
  createSchemeSchema,
  updateSchemeVersionSchema,
  sendBackSchema,
  approveSchema,
} from './scheme.validation';
import { validateRequest } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/authenticate.middleware';
import { authorize } from '../../middlewares/authorize.middleware';
import { Role } from '../../common/enums';

const router = Router();

// Public / optionally authenticated list and read
router.get('/', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, () => SchemeController.listSchemes(req, res, next));
  }
  return SchemeController.listSchemes(req, res, next);
});

// Explicit public read endpoint for current published scheme
router.get('/public/:schemeId', SchemeController.getPublicSchemeById);

// Scheme details: if token present, gives reviewer details, else public details
router.get('/:schemeId', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, () => SchemeController.getSchemeById(req, res, next));
  }
  return SchemeController.getSchemeById(req, res, next);
});

// Protected routes below
router.use(authenticate);

// Phase 4: Create Scheme (STATE_REVIEWER only)
router.post(
  '/',
  authorize([Role.STATE_REVIEWER]),
  validateRequest({ body: createSchemeSchema }),
  SchemeController.createScheme,
);

// Scheme Version History
router.get('/:schemeId/history', SchemeController.getSchemeHistory);

// Phase 7: Audit Logs for Scheme
router.get('/:schemeId/audit-logs', SchemeController.getSchemeAuditLogs);

// Phase 4: Create new Version for Scheme
router.post(
  '/:schemeId/versions',
  authorize([Role.STATE_REVIEWER]),
  validateRequest({ body: updateSchemeVersionSchema }),
  SchemeController.createNewVersion,
);

// Phase 4: Edit Version (STATE_REVIEWER)
router.patch(
  '/:schemeId/versions/:versionId',
  authorize([Role.STATE_REVIEWER]),
  validateRequest({ body: updateSchemeVersionSchema }),
  SchemeController.updateVersion,
);

// Phase 5: Submit for review (STATE_REVIEWER)
router.post(
  '/:schemeId/versions/:versionId/submit',
  authorize([Role.STATE_REVIEWER]),
  SchemeController.submitForReview,
);

// Phase 5: Approve & Publish (CENTRAL_REVIEWER)
router.post(
  '/:schemeId/versions/:versionId/approve',
  authorize([Role.CENTRAL_REVIEWER]),
  validateRequest({ body: approveSchema }),
  SchemeController.approveAndPublish,
);

// Phase 5: Send Back (CENTRAL_REVIEWER)
router.post(
  '/:schemeId/versions/:versionId/send-back',
  authorize([Role.CENTRAL_REVIEWER]),
  validateRequest({ body: sendBackSchema }),
  SchemeController.sendBack,
);

export default router;
