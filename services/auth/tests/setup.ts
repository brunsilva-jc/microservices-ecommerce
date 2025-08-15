import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Redis from 'ioredis-mock';

let mongoServer: MongoMemoryServer;

// Mock Redis
jest.mock('../src/database/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(new Redis()),
  getRedisClient: jest.fn().mockReturnValue(new Redis()),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
}));

// Setup before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// Cleanup after each test
afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});