import { AppError } from '../../src/common/utils/app-error';
import { HTTP_STATUS } from '../../src/common/constants';
import { ResponseFormatter } from '../../src/common/utils/response';
import { Response } from 'express';

describe('Common Utilities Unit Tests', () => {
  describe('AppError', () => {
    it('should create custom AppError with statusCode and default operational flag', () => {
      const error = new AppError('Custom error', HTTP_STATUS.BAD_REQUEST, 'CUSTOM_BAD_REQUEST');
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('CUSTOM_BAD_REQUEST');
      expect(error.isOperational).toBe(true);
    });

    it('should construct AppError factory helpers correctly', () => {
      const unauthorized = AppError.unauthorized();
      expect(unauthorized.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(unauthorized.errorCode).toBe('UNAUTHORIZED');

      const forbidden = AppError.forbidden();
      expect(forbidden.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
      expect(forbidden.errorCode).toBe('FORBIDDEN');

      const notFound = AppError.notFound();
      expect(notFound.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
      expect(notFound.errorCode).toBe('NOT_FOUND');

      const conflict = AppError.conflict('Already exists');
      expect(conflict.statusCode).toBe(HTTP_STATUS.CONFLICT);
      expect(conflict.errorCode).toBe('CONFLICT');

      const unprocessable = AppError.unprocessable('Cannot process');
      expect(unprocessable.statusCode).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    });
  });

  describe('ResponseFormatter', () => {
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
      jsonMock = jest.fn();
      statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      mockResponse = {
        status: statusMock,
        json: jsonMock,
      };
    });

    it('should format success response', () => {
      ResponseFormatter.success(mockResponse as Response, { key: 'val' }, 'Success msg');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Success msg',
        data: { key: 'val' },
      });
    });

    it('should format error response', () => {
      ResponseFormatter.error(mockResponse as Response, 'Error occurred', 400, 'BAD_REQ', [
        { field: 'test', message: 'invalid' },
      ]);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Error occurred',
        error: 'BAD_REQ',
        errors: [{ field: 'test', message: 'invalid' }],
      });
    });
  });
});
