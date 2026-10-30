import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { ResponseFormatter } from '../../common/utils/response';

export class UserController {
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.getUserById(req.params.id);
      ResponseFormatter.success(res, user, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await UserService.listUsers();
      ResponseFormatter.success(res, users, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
