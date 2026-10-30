import { HTTP_STATUS } from '../constants';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorCode: string = 'INTERNAL_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, 'BAD_REQUEST', details);
  }

  static unauthorized(message: string = 'Authentication required') {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Access denied') {
    return new AppError(message, HTTP_STATUS.FORBIDDEN, 'FORBIDDEN');
  }

  static notFound(message: string = 'Resource not found') {
    return new AppError(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
  }

  static conflict(message: string) {
    return new AppError(message, HTTP_STATUS.CONFLICT, 'CONFLICT');
  }

  static unprocessable(message: string, details?: unknown) {
    return new AppError(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, 'UNPROCESSABLE_ENTITY', details);
  }
}
