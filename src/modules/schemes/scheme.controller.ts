import { Request, Response, NextFunction } from 'express';
import { SchemeService } from './scheme.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { ResponseFormatter } from '../../common/utils/response';

export class SchemeController {
  static async createScheme(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SchemeService.createScheme(req.body, req.user!);
      ResponseFormatter.created(res, result, 'Scheme draft created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listSchemes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const search = req.query.search as string | undefined;

      const result = await SchemeService.listSchemes(req.user, page, limit, search);
      ResponseFormatter.success(res, result, 'Schemes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getSchemeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        const result = await SchemeService.getSchemeDetailsForReviewer(req.params.schemeId);
        ResponseFormatter.success(res, result, 'Scheme details retrieved successfully');
        return;
      }

      const result = await SchemeService.getPublicSchemeById(req.params.schemeId);
      ResponseFormatter.success(res, result, 'Published scheme retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getPublicSchemeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SchemeService.getPublicSchemeById(req.params.schemeId);
      ResponseFormatter.success(res, result, 'Published scheme retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getSchemeHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SchemeService.getSchemeHistory(req.params.schemeId);
      ResponseFormatter.success(res, result, 'Scheme history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

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

  static async getSchemeAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await AuditLogService.getSchemeAuditLogs(req.params.schemeId, page, limit);
      ResponseFormatter.success(res, result, 'Scheme audit logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
