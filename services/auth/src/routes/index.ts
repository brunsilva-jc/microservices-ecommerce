import Router from '@koa/router';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { healthRoutes } from './health.routes';

export const router = new Router();

// Mount route modules
router.use('/api/v1/auth', authRoutes.routes(), authRoutes.allowedMethods());
router.use('/api/v1/users', userRoutes.routes(), userRoutes.allowedMethods());
router.use('/health', healthRoutes.routes(), healthRoutes.allowedMethods());