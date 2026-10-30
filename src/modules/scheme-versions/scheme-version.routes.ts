import { Router } from 'express';
import { SchemeVersionController } from './scheme-version.controller';
import {
  updateSchemeVersionSchema,
  sendBackSchema,
  approveSchema,
} from '../schemes/scheme.validation';
import { validateRequest } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/authenticate.middleware';
import { authorize } from '../../middlewares/authorize.middleware';
import { Role } from '../../common/enums';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Create new version
router.post(
  '/',
  authorize([Role.STATE_REVIEWER]),
  validateRequest({ body: updateSchemeVersionSchema }),
  SchemeVersionController.createNewVersion,
);

// Edit version
router.patch(
  '/:versionId',
  authorize([Role.STATE_REVIEWER]),
  validateRequest({ body: updateSchemeVersionSchema }),
  SchemeVersionController.updateVersion,
);

// Submit for review
router.post(
  '/:versionId/submit',
  authorize([Role.STATE_REVIEWER]),
  SchemeVersionController.submitForReview,
);

// Approve & Publish
router.post(
  '/:versionId/approve',
  authorize([Role.CENTRAL_REVIEWER]),
  validateRequest({ body: approveSchema }),
  SchemeVersionController.approveAndPublish,
);

// Send back
router.post(
  '/:versionId/send-back',
  authorize([Role.CENTRAL_REVIEWER]),
  validateRequest({ body: sendBackSchema }),
  SchemeVersionController.sendBack,
);

export default router;
