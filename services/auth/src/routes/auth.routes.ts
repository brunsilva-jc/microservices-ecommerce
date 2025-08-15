import Router from '@koa/router';
import { AuthController } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validation.middleware';
import { authValidation } from '../validation/auth.validation';
import { authMiddleware } from '../middleware/auth.middleware';

export const authRoutes = new Router();

const authController = new AuthController();

// Public routes
authRoutes.post(
  '/register',
  validateBody(authValidation.register),
  authController.register,
);

authRoutes.post(
  '/login',
  validateBody(authValidation.login),
  authController.login,
);

authRoutes.post(
  '/refresh',
  validateBody(authValidation.refreshToken),
  authController.refreshToken,
);

authRoutes.post(
  '/forgot-password',
  validateBody(authValidation.forgotPassword),
  authController.forgotPassword,
);

authRoutes.post(
  '/reset-password',
  validateBody(authValidation.resetPassword),
  authController.resetPassword,
);

// Protected routes
authRoutes.post(
  '/logout',
  authMiddleware,
  authController.logout,
);

authRoutes.post(
  '/change-password',
  authMiddleware,
  validateBody(authValidation.changePassword),
  authController.changePassword,
);

authRoutes.get(
  '/verify-email/:token',
  authController.verifyEmail,
);