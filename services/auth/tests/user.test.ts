import request from 'supertest';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { router } from '../src/routes';
import { errorMiddleware } from '../src/middleware/error.middleware';
import { User } from '../src/models/user.model';
import { JWTService } from '../src/services/jwt.service';
import { getRedisClient } from '../src/database/redis';

describe('User Controller', () => {
  let app: Koa;
  let adminToken: string;
  let customerToken: string;
  let adminUserId: string;
  let customerUserId: string;

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

    // Create admin user
    const adminUser = new User({
      email: 'admin@example.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isEmailVerified: true,
    });
    await adminUser.save();
    adminUserId = adminUser._id.toString();
    const adminTokens = await JWTService.generateTokenPair(adminUser);
    adminToken = adminTokens.accessToken;

    // Create customer user
    const customerUser = new User({
      email: 'customer@example.com',
      password: 'customer123',
      firstName: 'Customer',
      lastName: 'User',
      role: 'customer',
      isEmailVerified: true,
    });
    await customerUser.save();
    customerUserId = customerUser._id.toString();
    const customerTokens = await JWTService.generateTokenPair(customerUser);
    customerToken = customerTokens.accessToken;
  });

  describe('GET /users/profile', () => {
    it('should get user profile when authenticated', async () => {
      const response = await request(app.callback())
        .get('/users/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('customer@example.com');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should require authentication', async () => {
      await request(app.callback())
        .get('/users/profile')
        .expect(401);
    });
  });

  describe('PUT /users/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
      };

      const response = await request(app.callback())
        .put('/users/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('UpdatedFirst');
      expect(response.body.data.user.lastName).toBe('UpdatedLast');
    });

    it('should not allow email update through profile endpoint', async () => {
      const updateData = {
        email: 'newemail@example.com',
        firstName: 'UpdatedFirst',
      };

      const response = await request(app.callback())
        .put('/users/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updateData)
        .expect(200);

      // Email should not be updated
      const user = await User.findById(customerUserId);
      expect(user!.email).toBe('customer@example.com');
    });
  });

  describe('DELETE /users/profile', () => {
    it('should allow user to delete their own account', async () => {
      const response = await request(app.callback())
        .delete('/users/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user is deactivated, not deleted
      const user = await User.findById(customerUserId);
      expect(user!.isActive).toBe(false);
    });
  });

  describe('GET /users (Admin)', () => {
    it('should get all users for admin', async () => {
      // Create additional users
      await User.create({
        email: 'user1@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'One',
      });

      await User.create({
        email: 'user2@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'Two',
      });

      const response = await request(app.callback())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(4); // admin + customer + 2 new users
      expect(response.body.data.total).toBe(4);
    });

    it('should not allow non-admin to get all users', async () => {
      const response = await request(app.callback())
        .get('/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should support pagination', async () => {
      // Create 15 users
      for (let i = 0; i < 15; i++) {
        await User.create({
          email: `user${i}@example.com`,
          password: 'password123',
          firstName: `User`,
          lastName: `${i}`,
        });
      }

      const response = await request(app.callback())
        .get('/users?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users).toHaveLength(7); // 17 total (2 existing + 15 new), page 2 with limit 10
      expect(response.body.data.page).toBe(2);
      expect(response.body.data.limit).toBe(10);
    });
  });

  describe('GET /users/:id (Admin)', () => {
    it('should get user by id for admin', async () => {
      const response = await request(app.callback())
        .get(`/users/${customerUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('customer@example.com');
    });

    it('should not allow non-admin to get user by id', async () => {
      const response = await request(app.callback())
        .get(`/users/${adminUserId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app.callback())
        .get(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/:id/status (Admin)', () => {
    it('should allow admin to activate/deactivate user', async () => {
      const response = await request(app.callback())
        .put(`/users/${customerUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.isActive).toBe(false);

      // Verify in database
      const user = await User.findById(customerUserId);
      expect(user!.isActive).toBe(false);
    });

    it('should not allow non-admin to change user status', async () => {
      await request(app.callback())
        .put(`/users/${adminUserId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ isActive: false })
        .expect(403);
    });
  });

  describe('DELETE /users/:id (Admin)', () => {
    it('should allow admin to delete user', async () => {
      const response = await request(app.callback())
        .delete(`/users/${customerUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user is deleted
      const user = await User.findById(customerUserId);
      expect(user).toBeNull();
    });

    it('should not allow non-admin to delete user', async () => {
      await request(app.callback())
        .delete(`/users/${adminUserId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should not allow admin to delete themselves', async () => {
      const response = await request(app.callback())
        .delete(`/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CANNOT_DELETE_SELF');
    });
  });

  describe('RBAC Middleware', () => {
    it('should allow admin to access admin routes', async () => {
      const response = await request(app.callback())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should block customer from admin routes', async () => {
      const response = await request(app.callback())
        .get('/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow vendor role for vendor-specific routes', async () => {
      // Create vendor user
      const vendorUser = new User({
        email: 'vendor@example.com',
        password: 'vendor123',
        firstName: 'Vendor',
        lastName: 'User',
        role: 'vendor',
      });
      await vendorUser.save();
      const vendorTokens = await JWTService.generateTokenPair(vendorUser);

      // Vendor should be able to access their profile
      const response = await request(app.callback())
        .get('/users/profile')
        .set('Authorization', `Bearer ${vendorTokens.accessToken}`)
        .expect(200);

      expect(response.body.data.user.role).toBe('vendor');
    });
  });
});