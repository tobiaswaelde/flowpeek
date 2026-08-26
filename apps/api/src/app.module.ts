import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { CaslModule } from './casl/casl.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { InitModule } from './modules/init/init.module.js';
import { ProvidersModule } from './modules/providers/providers.module.js';
import { RepositoriesModule } from './modules/repositories/repositories.module.js';
import { WebhooksModule } from './modules/webhooks/webhooks.module.js';
import { WorkflowRunsModule } from './modules/workflow-runs/workflow-runs.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ limit: 120, ttl: 60_000 }]),
    PrismaModule,
    CaslModule,
    InitModule,
    RepositoriesModule,
    ProvidersModule,
    JobsModule,
    AuthModule,
    HealthModule,
    WebhooksModule,
    WorkflowRunsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
