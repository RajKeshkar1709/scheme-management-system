import { Request, Response, NextFunction } from 'express';
import { SchemeService } from '../schemes/scheme.service';
import { ResponseFormatter } from '../../common/utils/response';

export class SchemeVersionController {
  static async createNewVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SchemeService.createNewVersion(req.params.schemeId, req.user!, req.body);
      ResponseFormatter.created(res, result, 'New scheme version created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SchemeService.updateVersion(
        req.params.schemeId,
        req.params.versionId,
        req.body,
        req.user!,
      );
      ResponseFormatter.success(res, result, 'Scheme version updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async submitForReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SchemeService.submitForReview(
        req.params.schemeId,
        req.params.versionId,
        req.user!,
      );
      ResponseFormatter.success(res, result, 'Scheme version submitted for review');
    } catch (error) {
      next(error);
    }
  }

  static async approveAndPublish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SchemeService.approveAndPublish(
        req.params.schemeId,
        req.params.versionId,
        req.body,
        req.user!,
      );
      ResponseFormatter.success(res, result, 'Scheme version approved and published');
    } catch (error) {
      next(error);
    }
  }

  static async sendBack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SchemeService.sendBack(
        req.params.schemeId,
        req.params.versionId,
        req.body,
        req.user!,
      );
      ResponseFormatter.success(res, result, 'Scheme version sent back with comments');
    } catch (error) {
      next(error);
    }
  }
}
