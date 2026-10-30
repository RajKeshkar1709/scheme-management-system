import { Request, Response, NextFunction } from 'express';
import { Role } from '../common/enums';
import { AppError } from '../common/utils/app-error';

export const authorize = (allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(`Forbidden: Requires one of [${allowedRoles.join(', ')}] role`),
      );
    }

    next();
  };
};
