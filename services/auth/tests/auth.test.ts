import request from 'supertest';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { router } from '../src/routes';
import { errorMiddleware } from '../src/middleware/error.middleware';
import { User } from '../src/models/user.model';
import { JWTService } from '../src/services/jwt.service';
import { getRedisClient } from '../src/database/redis';

describe('Auth Controller', () => {
  let app: Koa;

  beforeEach(async () => {
    app = new Koa();
    app.use(errorMiddleware);
    app.use(bodyParser());
    app.use(router.routes());
    app.use(router.allowedMethods());
    
    // Clear database before each test
    await User.deleteMany({});
    // Clear Redis
    const redis = getRedisClient();
    await redis.flushall();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app.callback())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
    });

    it('should not register a user with existing email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Create first user
      await User.create(userData);

      // Try to create another user with same email
      const response = await request(app.callback())
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
      };

      const response = await request(app.callback())
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Create user
      const user = new User(userData);
      await user.save();

      const response = await request(app.callback())
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app.callback())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should not login with deactivated account', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        isActive: false,
      };

      // Create deactivated user
      const user = new User(userData);
      await user.save();

      const response = await request(app.callback())
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      await user.save();

      const tokens = await JWTService.generateTokenPair(user);

      const response = await request(app.callback())
        .post('/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should not refresh with invalid token', async () => {
      const response = await request(app.callback())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      await user.save();

      const tokens = await JWTService.generateTokenPair(user);

      const response = await request(app.callback())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app.callback())
        .post('/auth/logout')
        .expect(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send reset email for existing user', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      await user.save();

      const response = await request(app.callback())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'oldpassword123',
        firstName: 'John',
        lastName: 'Doe',
      });
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      const response = await request(app.callback())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newpassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /auth/verify-email/:token', () => {
    it('should verify email with valid token', async () => {
      const verificationToken = 'verify-token-123';
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        emailVerificationToken: verificationToken,
        isEmailVerified: false,
      });
      await user.save();

      const response = await request(app.callback())
        .get(`/auth/verify-email/${verificationToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password when authenticated', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'oldpassword123',
        firstName: 'John',
        lastName: 'Doe',
      });
      await user.save();

      const tokens = await JWTService.generateTokenPair(user);

      const response = await request(app.callback())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});