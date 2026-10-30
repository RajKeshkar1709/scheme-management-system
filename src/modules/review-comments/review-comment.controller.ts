import { Request, Response, NextFunction } from 'express';
import { ReviewCommentService } from './review-comment.service';
import { ResponseFormatter } from '../../common/utils/response';

export class ReviewCommentController {
  static async getCommentsByVersion(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const comments = await ReviewCommentService.getCommentsByVersion(req.params.versionId);
      ResponseFormatter.success(res, comments, 'Review comments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
