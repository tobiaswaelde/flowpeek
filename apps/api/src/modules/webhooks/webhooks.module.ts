import { Module } from '@nestjs/common';

import { ProvidersModule } from '../providers/providers.module.js';
import { WebhookController } from './webhook.controller.js';
import { WebhookService } from './webhook.service.js';

@Module({
  imports: [ProvidersModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhooksModule {}
