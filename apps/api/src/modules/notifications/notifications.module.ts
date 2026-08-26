import { Module } from '@nestjs/common';

import { CaslModule } from '../../casl/casl.module.js';
import { JobsModule } from '../../jobs/jobs.module.js';
import { SecurityModule } from '../../security/security.module.js';
import { RepositoriesModule } from '../repositories/repositories.module.js';
import { EmailNotificationAdapter } from './email-notification.adapter.js';
import { GotifyNotificationAdapter } from './gotify-notification.adapter.js';
import { NotificationDeliveriesController } from './notification-deliveries.controller.js';
import { NotificationDeliveryService } from './notification-delivery.service.js';
import { NotificationRulesController } from './notification-rules.controller.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NtfyNotificationAdapter } from './ntfy-notification.adapter.js';

/** Registers repository-scoped notification configuration. */
@Module({
  imports: [CaslModule, JobsModule, RepositoriesModule, SecurityModule],
  controllers: [NotificationsController, NotificationRulesController, NotificationDeliveriesController],
  providers: [
    NotificationsService,
    NotificationDeliveryService,
    EmailNotificationAdapter,
    GotifyNotificationAdapter,
    NtfyNotificationAdapter,
  ],
  exports: [NotificationsService, NotificationDeliveryService],
})
export class NotificationsModule {}
