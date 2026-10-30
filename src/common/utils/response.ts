import { Response } from 'express';
import { HTTP_STATUS } from '../constants';
import { ApiResponse } from '../types';

export class ResponseFormatter {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = HTTP_STATUS.OK,
  ): Response {
    const payload: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(payload);
  }

  static created<T>(res: Response, data: T, message?: string): Response {
    return this.success(res, data, message, HTTP_STATUS.CREATED);
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorCode: string = 'ERROR',
    errors?: unknown,
  ): Response {
    const payload: ApiResponse = {
      success: false,
      message,
      error: errorCode,
      ...(errors ? { errors } : {}),
    };
    return res.status(statusCode).json(payload);
  }
}
