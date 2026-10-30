import { Request, Response, NextFunction } from 'express';
import { ReviewFlagService } from './review-flag.service';
import { ResponseFormatter } from '../../common/utils/response';
import { ReviewFlagStatus } from '../../common/enums';

export class ReviewFlagController {
  static async listFlags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schemeId = req.query.schemeId as string | undefined;
      const status = req.query.status as ReviewFlagStatus | undefined;

      const flags = await ReviewFlagService.listFlags(schemeId, status);
      ResponseFormatter.success(res, flags, 'Review flags retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async resolveFlag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const flag = await ReviewFlagService.resolveFlag(req.params.id);
      ResponseFormatter.success(res, flag, 'Review flag resolved successfully');
    } catch (error) {
      next(error);
    }
  }
}
