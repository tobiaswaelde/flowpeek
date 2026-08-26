import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { NotificationChannelType, NotificationDeliveryStatus, type Prisma } from '../../generated/prisma/client.js';
import { JobRunnerService } from '../../jobs/job-runner.service.js';
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
  attempts: { orderBy: { createdAt: 'desc' } },
} as const;

type NotificationDeliveryModel = Prisma.NotificationDeliveryGetPayload<{ include: typeof deliveryInclude }>;

const maximumAttempts = 3;

/** Return the bounded exponential delay before a subsequent delivery attempt. */
export function notificationRetryDelayMs(attempt: number): number {
  return Math.min(60_000 * 2 ** Math.max(attempt - 1, 0), 60 * 60_000);
}

/** Sends pending notification deliveries through their configured channel adapters. */
@Injectable()
export class NotificationDeliveryService {
  private readonly adapters: Map<NotificationChannelType, NotificationChannelAdapter>;
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobRunnerService,
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

  /** Retry delivery records whose bounded exponential delay has elapsed. */
  @Interval(60_000)
  async scheduleRetries(): Promise<void> {
    await this.jobs.run('notification-delivery-retry', () => this.deliverPending());
  }

  /** Attempt every requested pending delivery once, retaining an immutable attempt audit trail. */
  async deliverPending(deliveryIds?: string[]): Promise<void> {
    const now = new Date();
    const deliveries = await this.prisma.notificationDelivery.findMany({
      include: deliveryInclude,
      where: {
        status: NotificationDeliveryStatus.PENDING,
        ...(deliveryIds ? { id: { in: deliveryIds } } : {}),
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
    });
    for (const delivery of deliveries) await this.deliver(delivery);
  }

  private async deliver(delivery: NotificationDeliveryModel): Promise<void> {
    const attemptedChannels = new Map<string, (typeof delivery.attempts)[number]>();
    for (const attempt of delivery.attempts) {
      if (!attemptedChannels.has(attempt.notificationChannelId))
        attemptedChannels.set(attempt.notificationChannelId, attempt);
    }
    const enabledChannels = delivery.notificationRule.channelLinks
      .map((link) => link.notificationChannel)
      .filter((channel) => channel.enabled);
    const channels = enabledChannels.filter(
      (channel) => channel.enabled && !attemptedChannels.get(channel.id)?.deliveredAt,
    );
    if (enabledChannels.length === 0) {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          finalError: 'No enabled notification channels are configured.',
          nextAttemptAt: null,
          status: NotificationDeliveryStatus.FAILED,
        },
      });
      return;
    }
    if (channels.length === 0) {
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { finalError: null, nextAttemptAt: null, status: NotificationDeliveryStatus.DELIVERED },
      });
      return;
    }

    const payload = this.createPayload(delivery);
    const failedChannelIds = new Set(
      [...attemptedChannels.values()]
        .filter((attempt) => !attempt.deliveredAt)
        .map((attempt) => attempt.notificationChannelId),
    );
    const attemptNumber = Math.max(0, ...delivery.attempts.map((attempt) => attempt.attempt)) + 1;
    for (const channel of channels) {
      try {
        const adapter = this.adapters.get(channel.type);
        if (!adapter) throw new Error('Notification channel type is not supported.');
        await adapter.send(channel, payload);
        failedChannelIds.delete(channel.id);
        await this.prisma.notificationDeliveryAttempt.create({
          data: {
            attempt: attemptNumber,
            deliveredAt: new Date(),
            notificationChannelId: channel.id,
            notificationDeliveryId: delivery.id,
          },
        });
      } catch (error) {
        failedChannelIds.add(channel.id);
        await this.prisma.notificationDeliveryAttempt.create({
          data: {
            attempt: attemptNumber,
            error: this.errorMessage(error),
            notificationChannelId: channel.id,
            notificationDeliveryId: delivery.id,
          },
        });
      }
    }

    const hasRemainingFailedChannels = failedChannelIds.size > 0;
    await this.prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: !hasRemainingFailedChannels
        ? { finalError: null, nextAttemptAt: null, status: NotificationDeliveryStatus.DELIVERED }
        : attemptNumber >= maximumAttempts
          ? {
              finalError: 'One or more notification channels failed.',
              nextAttemptAt: null,
              status: NotificationDeliveryStatus.FAILED,
            }
          : {
              finalError: null,
              nextAttemptAt: new Date(Date.now() + notificationRetryDelayMs(attemptNumber)),
              status: NotificationDeliveryStatus.PENDING,
            },
    });
    if (hasRemainingFailedChannels)
      this.logger.warn(`Notification delivery ${delivery.id} failed for ${failedChannelIds.size} channel(s).`);
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
