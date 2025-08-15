import { Context } from 'koa';
import { User } from '../models/user.model';
import { JWTService } from '../services/jwt.service';
import { AppError } from '../middleware/error.middleware';
import { Logger } from '../utils/logger';

const log = new Logger('AuthController');

export class AuthController {
  async register(ctx: Context) {
    const { email, password, firstName, lastName, role } = ctx.request.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role: role || 'customer',
    });

    // Generate email verification token
    user.emailVerificationToken = Math.random().toString(36).substring(2, 15);
    
    await user.save();

    // Generate tokens
    const tokens = await JWTService.generateTokenPair(user);

    // TODO: Send verification email

    log.info(`New user registered: ${user.email}`);

    ctx.status = 201;
    ctx.body = {
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        user: user.toJSON(),
        tokens,
      },
    };
  }

  async login(ctx: Context) {
    const { email, password } = ctx.request.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = await JWTService.generateTokenPair(user);

    log.info(`User logged in: ${user.email}`);

    ctx.body = {
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        tokens,
      },
    };
  }

  async refreshToken(ctx: Context) {
    const { refreshToken } = ctx.request.body;

    // Verify refresh token
    let decoded;
    try {
      decoded = JWTService.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Validate refresh token in Redis
    const userId = await JWTService.validateRefreshToken(refreshToken);
    if (!userId || userId !== decoded.userId) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Get user
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 404, 'USER_NOT_FOUND');
    }

    // Invalidate old refresh token
    await JWTService.invalidateRefreshToken(refreshToken);

    // Generate new token pair
    const tokens = await JWTService.generateTokenPair(user);

    ctx.body = {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens,
      },
    };
  }

  async logout(ctx: Context) {
    const authHeader = ctx.headers.authorization;
    const token = authHeader!.split(' ')[1];

    // Blacklist the access token
    await JWTService.blacklistToken(token);

    // If refresh token is provided, invalidate it
    const { refreshToken } = ctx.request.body || {};
    if (refreshToken) {
      await JWTService.invalidateRefreshToken(refreshToken);
    }

    log.info(`User logged out: ${ctx.user!.email}`);

    ctx.body = {
      success: true,
      message: 'Logout successful',
    };
  }

  async forgotPassword(ctx: Context) {
    const { email } = ctx.request.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      ctx.body = {
        success: true,
        message: 'If the email exists, a reset link has been sent',
      };
      return;
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // TODO: Send password reset email

    log.info(`Password reset requested for: ${user.email}`);

    ctx.body = {
      success: true,
      message: 'If the email exists, a reset link has been sent',
      // In development, include the token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    };
  }

  async resetPassword(ctx: Context) {
    const { token, password } = ctx.request.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    log.info(`Password reset for: ${user.email}`);

    ctx.body = {
      success: true,
      message: 'Password reset successful',
    };
  }

  async changePassword(ctx: Context) {
    const { currentPassword, newPassword } = ctx.request.body;
    const userId = ctx.user!.userId;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    log.info(`Password changed for: ${user.email}`);

    ctx.body = {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async verifyEmail(ctx: Context) {
    const { token } = ctx.params;

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      throw new AppError('Invalid verification token', 400, 'INVALID_TOKEN');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    log.info(`Email verified for: ${user.email}`);

    ctx.body = {
      success: true,
      message: 'Email verified successfully',
    };
  }
}