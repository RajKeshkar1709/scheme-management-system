import { Request, Response, NextFunction } from 'express';
import { EligibilityRuleService } from './eligibility-rule.service';
import { ResponseFormatter } from '../../common/utils/response';

export class EligibilityRuleController {
  static async createRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await EligibilityRuleService.createRule(req.body, req.user!.id);
      ResponseFormatter.created(res, result, 'Eligibility rule created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listRules(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rules = await EligibilityRuleService.listRules();
      ResponseFormatter.success(res, rules, 'Eligibility rules retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getRuleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rule = await EligibilityRuleService.getRuleById(req.params.ruleId);
      ResponseFormatter.success(res, rule, 'Eligibility rule retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await EligibilityRuleService.updateRule(
        req.params.ruleId,
        req.body,
        req.user!.id,
      );
      ResponseFormatter.success(res, result, 'Eligibility rule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getDependentSchemes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schemes = await EligibilityRuleService.getDependentSchemes(req.params.ruleId);
      ResponseFormatter.success(res, schemes, 'Dependent schemes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
