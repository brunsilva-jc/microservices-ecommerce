import { Context, Next } from 'koa';
import { Logger } from '../utils/logger';

const log = new Logger('ErrorMiddleware');

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export async function errorMiddleware(ctx: Context, next: Next) {
  try {
    await next();
  } catch (error: any) {
    log.error('Request error:', error);

    if (error instanceof AppError) {
      ctx.status = error.statusCode;
      ctx.body = {
        success: false,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    } else if (error.name === 'ValidationError') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: {
          message: 'Validation error',
          details: error.details || error.message,
        },
      };
    } else if (error.name === 'UnauthorizedError') {
      ctx.status = 401;
      ctx.body = {
        success: false,
        error: {
          message: 'Unauthorized',
        },
      };
    } else {
      ctx.status = error.statusCode || 500;
      ctx.body = {
        success: false,
        error: {
          message: ctx.app.env === 'production' 
            ? 'Internal server error' 
            : error.message,
        },
      };
    }
  }
}