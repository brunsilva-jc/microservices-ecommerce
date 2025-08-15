import { Context, Next } from 'koa';
import { JWTService, TokenPayload } from '../services/jwt.service';
import { AppError } from './error.middleware';

declare module 'koa' {
  interface Context {
    user?: TokenPayload;
  }
}

export async function authMiddleware(ctx: Context, next: Next) {
  const authHeader = ctx.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401, 'NO_TOKEN');
  }

  const token = authHeader.split(' ')[1];

  try {
    // Check if token is blacklisted
    const isBlacklisted = await JWTService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new AppError('Token has been revoked', 401, 'TOKEN_REVOKED');
    }

    // Verify token
    const decoded = JWTService.verifyAccessToken(token);
    ctx.user = decoded;

    await next();
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
  }
}

export function requireRole(...roles: string[]) {
  return async (ctx: Context, next: Next) => {
    if (!ctx.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    if (!roles.includes(ctx.user.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    await next();
  };
}