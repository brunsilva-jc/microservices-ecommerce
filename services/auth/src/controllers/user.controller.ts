import { Context } from 'koa';
import { User } from '../models/user.model';
import { AppError } from '../middleware/error.middleware';
import { Logger } from '../utils/logger';

const log = new Logger('UserController');

export class UserController {
  async getProfile(ctx: Context) {
    const userId = ctx.user!.userId;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    ctx.body = {
      success: true,
      data: {
        user: user.toJSON(),
      },
    };
  }

  async updateProfile(ctx: Context) {
    const userId = ctx.user!.userId;
    const { firstName, lastName } = ctx.request.body;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    await user.save();

    log.info(`Profile updated for: ${user.email}`);

    ctx.body = {
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON(),
      },
    };
  }

  async deleteAccount(ctx: Context) {
    const userId = ctx.user!.userId;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Soft delete - just deactivate the account
    user.isActive = false;
    await user.save();

    log.info(`Account deactivated for: ${user.email}`);

    ctx.body = {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  // Admin functions
  async getAllUsers(ctx: Context) {
    const { page = 1, limit = 10, role, isActive } = ctx.query;

    const query: any = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .select('-password -refreshTokens'),
      User.countDocuments(query),
    ]);

    ctx.body = {
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    };
  }

  async getUserById(ctx: Context) {
    const { id } = ctx.params;

    const user = await User.findById(id).select('-password -refreshTokens');
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    ctx.body = {
      success: true,
      data: {
        user,
      },
    };
  }

  async updateUserStatus(ctx: Context) {
    const { id } = ctx.params;
    const { isActive } = ctx.request.body;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    user.isActive = isActive;
    await user.save();

    log.info(`User status updated for: ${user.email} - Active: ${isActive}`);

    ctx.body = {
      success: true,
      message: 'User status updated successfully',
      data: {
        user: user.toJSON(),
      },
    };
  }

  async deleteUser(ctx: Context) {
    const { id } = ctx.params;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Hard delete
    await user.deleteOne();

    log.info(`User permanently deleted: ${user.email}`);

    ctx.body = {
      success: true,
      message: 'User deleted successfully',
    };
  }
}