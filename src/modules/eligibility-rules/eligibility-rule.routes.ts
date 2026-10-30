import { Router } from 'express';
import { EligibilityRuleController } from './eligibility-rule.controller';
import {
  createEligibilityRuleSchema,
  updateEligibilityRuleSchema,
} from './eligibility-rule.validation';
import { validateRequest } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/authenticate.middleware';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validateRequest({ body: createEligibilityRuleSchema }),
  EligibilityRuleController.createRule,
);

router.get('/', EligibilityRuleController.listRules);
router.get('/:ruleId', EligibilityRuleController.getRuleById);

router.patch(
  '/:ruleId',
  validateRequest({ body: updateEligibilityRuleSchema }),
  EligibilityRuleController.updateRule,
);

router.get('/:ruleId/schemes', EligibilityRuleController.getDependentSchemes);

export default router;
