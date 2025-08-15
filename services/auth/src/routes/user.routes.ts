import Router from '@koa/router';
import { UserController } from '../controllers/user.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { authValidation } from '../validation/auth.validation';

export const userRoutes = new Router();

const userController = new UserController();

// All user routes require authentication
userRoutes.use(authMiddleware);

// User profile routes
userRoutes.get('/profile', userController.getProfile);
userRoutes.put(
  '/profile',
  validateBody(authValidation.updateProfile),
  userController.updateProfile,
);
userRoutes.delete('/profile', userController.deleteAccount);

// Admin only routes
userRoutes.get(
  '/',
  requireRole('admin'),
  userController.getAllUsers,
);

userRoutes.get(
  '/:id',
  requireRole('admin'),
  userController.getUserById,
);

userRoutes.put(
  '/:id/status',
  requireRole('admin'),
  userController.updateUserStatus,
);

userRoutes.delete(
  '/:id',
  requireRole('admin'),
  userController.deleteUser,
);