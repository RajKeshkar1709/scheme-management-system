import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from './audit-log.service';
import { ResponseFormatter } from '../../common/utils/response';

export class AuditLogController {
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

  static async getAllAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const { entityType, entityId, changedBy } = req.query;

      const result = await AuditLogService.getAllAuditLogs(
        {
          entityType: entityType as string,
          entityId: entityId as string,
          changedBy: changedBy as string,
        },
        page,
        limit,
      );
      ResponseFormatter.success(res, result, 'Audit logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
