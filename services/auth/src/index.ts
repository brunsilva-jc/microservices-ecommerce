import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import helmet from 'koa-helmet';
import logger from 'koa-logger';
import { config } from './config';
import { errorMiddleware } from './middleware/error.middleware';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { connectDatabase } from './database/connection';
import { connectRedis } from './database/redis';
import { router } from './routes';
import { swaggerMiddleware } from './middleware/swagger.middleware';
import { Logger } from './utils/logger';

const app = new Koa();
const log = new Logger('AuthService');

async function startServer() {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();

    // Security middleware
    app.use(helmet());
    app.use(cors({
      origin: config.cors.origin,
      credentials: true,
    }));

    // Request parsing
    app.use(bodyParser({
      jsonLimit: '10mb',
    }));

    // Logging
    if (config.env !== 'test') {
      app.use(logger());
    }

    // Rate limiting
    app.use(rateLimitMiddleware);

    // Error handling
    app.use(errorMiddleware);

    // Swagger documentation
    swaggerMiddleware(app);

    // Routes
    app.use(router.routes());
    app.use(router.allowedMethods());

    // Start server
    const server = app.listen(config.port, () => {
      log.info(`Auth service running on port ${config.port}`);
      log.info(`Environment: ${config.env}`);
      log.info(`Swagger docs available at http://localhost:${config.port}/swagger`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      log.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        log.info('HTTP server closed');
      });
    });

  } catch (error) {
    log.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();