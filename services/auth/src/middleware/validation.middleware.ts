import { Context, Next } from 'koa';
import Joi from 'joi';
import { AppError } from './error.middleware';

export function validateBody(schema: Joi.ObjectSchema) {
  return async (ctx: Context, next: Next) => {
    try {
      const validated = await schema.validateAsync(ctx.request.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      ctx.request.body = validated;
      await next();
    } catch (error: any) {
      if (error.isJoi) {
        const errors = error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
      }
      throw error;
    }
  };
}

export function validateQuery(schema: Joi.ObjectSchema) {
  return async (ctx: Context, next: Next) => {
    try {
      const validated = await schema.validateAsync(ctx.query, {
        abortEarly: false,
        stripUnknown: true,
      });
      ctx.query = validated;
      await next();
    } catch (error: any) {
      if (error.isJoi) {
        const errors = error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
      }
      throw error;
    }
  };
}

export function validateParams(schema: Joi.ObjectSchema) {
  return async (ctx: Context, next: Next) => {
    try {
      const validated = await schema.validateAsync(ctx.params, {
        abortEarly: false,
        stripUnknown: true,
      });
      ctx.params = validated;
      await next();
    } catch (error: any) {
      if (error.isJoi) {
        const errors = error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
      }
      throw error;
    }
  };
}