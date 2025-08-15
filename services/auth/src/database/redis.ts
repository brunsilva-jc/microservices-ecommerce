import Redis from 'ioredis';
import { config } from '../config';
import { Logger } from '../utils/logger';

const log = new Logger('Redis');

let redisClient: Redis | null = null;

export async function connectRedis(): Promise<Redis> {
  try {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('connect', () => {
      log.info('Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      log.error('Redis connection error:', error);
    });

    // Test connection
    await redisClient.ping();
    
    return redisClient;
  } catch (error) {
    log.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    log.info('Redis disconnected');
  }
}