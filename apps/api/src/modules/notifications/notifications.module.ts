import { Module } from '@nestjs/common';

import { CaslModule } from '../../casl/casl.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

/** Registers repository-scoped notification configuration. */
@Module({
  imports: [CaslModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
