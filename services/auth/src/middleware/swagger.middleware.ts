import Koa from 'koa';
import { SwaggerRouter } from 'koa-swagger-decorator';
import path from 'path';

export function swaggerMiddleware(app: Koa) {
  const router = new SwaggerRouter();

  router.swagger({
    title: 'E-commerce Auth Service API',
    description: 'Authentication and authorization service for the e-commerce platform',
    version: '0.1.0',
    prefix: '/api/v1',
    swaggerHtmlEndpoint: '/swagger',
    swaggerJsonEndpoint: '/swagger.json',
    swaggerConfiguration: {
      display: {
        defaultModelsExpandDepth: 4,
        defaultModelExpandDepth: 3,
        docExpansion: 'list',
        defaultModelRendering: 'model',
      },
    },
  });

  // Map routes
  router.mapDir(path.resolve(__dirname, '../routes'), {
    recursive: true,
    ignore: ['**/*.test.ts', '**/*.spec.ts'],
  });

  app.use(router.routes());
  app.use(router.allowedMethods());
}