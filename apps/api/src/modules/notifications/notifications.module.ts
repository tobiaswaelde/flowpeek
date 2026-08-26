import { Module } from '@nestjs/common';

import { CaslModule } from '../../casl/casl.module.js';
import { SecurityModule } from '../../security/security.module.js';
import { RepositoriesModule } from '../repositories/repositories.module.js';
import { NotificationRulesController } from './notification-rules.controller.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

/** Registers repository-scoped notification configuration. */
@Module({
  imports: [CaslModule, RepositoriesModule, SecurityModule],
  controllers: [NotificationsController, NotificationRulesController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
