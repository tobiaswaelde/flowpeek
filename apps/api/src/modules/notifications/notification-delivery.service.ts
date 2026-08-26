import { Injectable, Logger } from '@nestjs/common';

import { NotificationChannelType, NotificationDeliveryStatus, type Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailNotificationAdapter } from './email-notification.adapter.js';
import { GotifyNotificationAdapter } from './gotify-notification.adapter.js';
import type { NotificationChannelAdapter, NotificationPayload } from './notification-channel-adapter.js';
import { NtfyNotificationAdapter } from './ntfy-notification.adapter.js';

const deliveryInclude = {
  notificationRule: {
    include: {
      channelLinks: { include: { notificationChannel: true } },
    },
  },
  workflowRun: {
    include: {
      repository: { include: { providerAccount: true } },
    },
  },
} as const;

type NotificationDeliveryModel = Prisma.NotificationDeliveryGetPayload<{ include: typeof deliveryInclude }>;

/** Sends pending notification deliveries through their configured channel adapters. */
@Injectable()
export class NotificationDeliveryService {
  private readonly adapters: Map<NotificationChannelType, NotificationChannelAdapter>;
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    email: EmailNotificationAdapter,
    gotify: GotifyNotificationAdapter,
    ntfy: NtfyNotificationAdapter,
  ) {
    this.adapters = new Map<NotificationChannelType, NotificationChannelAdapter>([
      [email.type, email],
      [gotify.type, gotify],
      [ntfy.type, ntfy],
    ]);
  }

  /** Attempt every requested pending delivery once, retaining an immutable attempt audit trail. */
  async deliverPending(deliveryIds?: string[]): Promise<void> {
    const deliveries = await this.prisma.notificationDelivery.findMany({
      include: deliveryInclude,
      where: {
        status: NotificationDeliveryStatus.PENDING,
        ...(deliveryIds ? { id: { in: deliveryIds } } : {}),
      },
    });
    for (const delivery of deliveries) await this.deliver(delivery);
  }

  private async deliver(delivery: NotificationDeliveryModel): Promise<void> {
    const channels = delivery.notificationRule.channelLinks
      .map((link) => link.notificationChannel)
      .filter((channel) => channel.enabled);
    if (channels.length === 0) {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          finalError: 'No enabled notification channels are configured.',
          status: NotificationDeliveryStatus.FAILED,
        },
      });
      return;
    }

    const payload = this.createPayload(delivery);
    const failures: string[] = [];
    for (const channel of channels) {
      try {
        const adapter = this.adapters.get(channel.type);
        if (!adapter) throw new Error('Notification channel type is not supported.');
        await adapter.send(channel, payload);
        await this.prisma.notificationDeliveryAttempt.create({
          data: {
            attempt: 1,
            deliveredAt: new Date(),
            notificationChannelId: channel.id,
            notificationDeliveryId: delivery.id,
          },
        });
      } catch (error) {
        failures.push(channel.id);
        await this.prisma.notificationDeliveryAttempt.create({
          data: {
            attempt: 1,
            error: this.errorMessage(error),
            notificationChannelId: channel.id,
            notificationDeliveryId: delivery.id,
          },
        });
      }
    }

    await this.prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data:
        failures.length === 0
          ? { finalError: null, status: NotificationDeliveryStatus.DELIVERED }
          : { finalError: 'One or more notification channels failed.', status: NotificationDeliveryStatus.FAILED },
    });
    if (failures.length > 0)
      this.logger.warn(`Notification delivery ${delivery.id} failed for ${failures.length} channel(s).`);
  }

  private createPayload(delivery: NotificationDeliveryModel): NotificationPayload {
    const { workflowRun } = delivery;
    return {
      completedAt: workflowRun.completedAt,
      durationMs: workflowRun.durationMs,
      provider: workflowRun.repository.providerAccount.providerType,
      repository: `${workflowRun.repository.owner}/${workflowRun.repository.name}`,
      runUrl: workflowRun.url,
      status: workflowRun.status,
      workflowName: workflowRun.workflowName,
    };
  }

  private errorMessage(error: unknown): string {
    if (
      error instanceof Error &&
      /^Gotify returned HTTP \d+\.$|^ntfy returned HTTP \d+\.$|^SMTP transport is not configured\.$/.test(error.message)
    ) {
      return error.message;
    }
    return 'Notification delivery failed.';
  }
}
