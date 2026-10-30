import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ResponseFormatter } from '../../common/utils/response';
import { HTTP_STATUS } from '../../common/constants';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      ResponseFormatter.created(res, result, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      ResponseFormatter.success(res, result, 'Login successful', HTTP_STATUS.OK);
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user!.id);
      ResponseFormatter.success(res, user, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
