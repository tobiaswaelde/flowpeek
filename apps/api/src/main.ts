import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

import { AppModule } from './app.module.js';
import { ENV } from './config/env.js';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Flowpeek API')
      .setDescription('Read-only workflow status tracking API.')
      .setVersion('1.0')
      .build(),
  );

  app.use(
    '/docs',
    apiReference({
      content: document,
      hideClientButton: true,
      metaData: {
        title: 'Flowpeek API',
      },
      telemetry: false,
    }),
  );

  await app.listen(ENV.PORT);
}

void bootstrap();
