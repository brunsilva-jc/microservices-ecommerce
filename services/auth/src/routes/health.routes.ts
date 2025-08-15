import Router from '@koa/router';
import mongoose from 'mongoose';
import { getRedisClient } from '../database/redis';

export const healthRoutes = new Router();

healthRoutes.get('/', async (ctx) => {
  ctx.body = {
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  };
});

healthRoutes.get('/live', async (ctx) => {
  ctx.body = {
    status: 'alive',
    timestamp: new Date().toISOString(),
  };
});

healthRoutes.get('/ready', async (ctx) => {
  const checks = {
    mongodb: false,
    redis: false,
  };

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      checks.mongodb = true;
    }
  } catch (error) {
    // MongoDB not ready
  }

  // Check Redis
  try {
    const redis = getRedisClient();
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    // Redis not ready
  }

  const isReady = Object.values(checks).every((check) => check === true);

  ctx.status = isReady ? 200 : 503;
  ctx.body = {
    status: isReady ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  };
});