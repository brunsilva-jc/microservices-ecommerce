import { Context, Next } from 'koa';
import { getRedisClient } from '../database/redis';
import { AppError } from './error.middleware';
import { config } from '../config';

export async function rateLimitMiddleware(ctx: Context, next: Next) {
  // Skip rate limiting in test environment
  if (config.env === 'test') {
    return next();
  }

  const redis = getRedisClient();
  const key = `rate_limit:${ctx.ip}`;
  
  try {
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, Math.floor(config.rateLimit.window / 1000));
    }
    
    if (current > config.rateLimit.max) {
      throw new AppError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED');
    }
    
    ctx.set('X-RateLimit-Limit', config.rateLimit.max.toString());
    ctx.set('X-RateLimit-Remaining', Math.max(0, config.rateLimit.max - current).toString());
    
    await next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    // If Redis fails, allow the request but log the error
    console.error('Rate limit check failed:', error);
    await next();
  }
}