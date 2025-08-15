import jwt from 'jsonwebtoken';
import { config } from '../config';
import { IUser } from '../models/user.model';
import { getRedisClient } from '../database/redis';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JWTService {
  private static readonly BLACKLIST_PREFIX = 'blacklist:';
  private static readonly TOKEN_PREFIX = 'token:';

  static generateAccessToken(user: IUser): string {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'ecommerce-auth',
      audience: 'ecommerce-platform',
    });
  }

  static generateRefreshToken(user: IUser): string {
    const payload = {
      userId: user._id.toString(),
      type: 'refresh',
    };

    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'ecommerce-auth',
    });
  }

  static async generateTokenPair(user: IUser): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store refresh token in Redis for tracking
    const redis = getRedisClient();
    await redis.setex(
      `${this.TOKEN_PREFIX}${refreshToken}`,
      7 * 24 * 60 * 60, // 7 days
      user._id.toString(),
    );

    return { accessToken, refreshToken };
  }

  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: 'ecommerce-auth',
        audience: 'ecommerce-platform',
      }) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static verifyRefreshToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'ecommerce-auth',
      }) as { userId: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static async blacklistToken(token: string): Promise<void> {
    const redis = getRedisClient();
    const decoded = jwt.decode(token) as any;
    
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.setex(`${this.BLACKLIST_PREFIX}${token}`, ttl, '1');
      }
    }
  }

  static async isTokenBlacklisted(token: string): Promise<boolean> {
    const redis = getRedisClient();
    const result = await redis.get(`${this.BLACKLIST_PREFIX}${token}`);
    return result === '1';
  }

  static async invalidateRefreshToken(token: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(`${this.TOKEN_PREFIX}${token}`);
  }

  static async validateRefreshToken(token: string): Promise<string | null> {
    const redis = getRedisClient();
    const userId = await redis.get(`${this.TOKEN_PREFIX}${token}`);
    return userId;
  }
}