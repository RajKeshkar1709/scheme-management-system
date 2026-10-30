import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../common/utils/app-error';
import { ResponseFormatter } from '../common/utils/response';
import { HTTP_STATUS } from '../common/constants';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    return ResponseFormatter.error(res, err.message, err.statusCode, err.errorCode, err.details);
  }

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return ResponseFormatter.error(
      res,
      'Validation failed',
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR',
      formattedErrors,
    );
  }

  console.error('Unhandled error occurred:', err);

  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected internal error occurred'
      : err.message || 'An unexpected internal error occurred';

  return ResponseFormatter.error(
    res,
    message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    'INTERNAL_SERVER_ERROR',
  );
};
