import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce-product',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
    },
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: {
      product: 300, // 5 minutes
      category: 600, // 10 minutes
      search: 60, // 1 minute
    },
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4200'],
  },
  
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  
  search: {
    minQueryLength: 2,
    maxResults: 100,
  },
  
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    imageStoragePath: process.env.IMAGE_STORAGE_PATH || '/uploads/products',
  },
  
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    prefix: 'product:',
  },
  
  authService: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  },
};