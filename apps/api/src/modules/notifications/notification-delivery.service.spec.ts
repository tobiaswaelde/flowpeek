import { NotificationDeliveryStatus } from '../../generated/prisma/client.js';
import type { JobRunnerService } from '../../jobs/job-runner.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { AppriseNotificationAdapter } from './apprise-notification.adapter.js';
import { NotificationDeliveryService, notificationRetryDelayMs } from './notification-delivery.service.js';

describe('NotificationDeliveryService', () => {
  it('uses bounded exponential retry delays', () => {
    expect(notificationRetryDelayMs(1)).toBe(60_000);
    expect(notificationRetryDelayMs(2)).toBe(120_000);
    expect(notificationRetryDelayMs(10)).toBe(60 * 60_000);
  });

  it('records a failed attempt and schedules a retry without resending completed channels', async () => {
    const prisma = {
      notificationDelivery: {
        findMany: jest.fn().mockResolvedValue([
          {
            attempts: [],
            id: 'delivery-a',
            notificationRule: {
              channelLinks: [
                {
                  notificationChannel: {
                    encryptedUrl: 'encrypted-url',
                    enabled: true,
                    id: 'channel-a',
                  },
                },
              ],
            },
            workflowRun: {
              completedAt: new Date('2026-08-26T12:00:00.000Z'),
              durationMs: 60_000,
              repository: {
                name: 'flowpeek',
                owner: 'flowpeek',
                providerAccount: { providerType: 'GITHUB' },
              },
              status: 'FAILED',
              url: 'https://github.com/flowpeek/flowpeek/actions/runs/1',
              workflowName: 'Test',
            },
          },
        ]),
        update: jest.fn().mockResolvedValue(undefined),
      },
      notificationDeliveryAttempt: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const apprise = { send: jest.fn().mockRejectedValue(new Error('Apprise notification delivery failed.')) };
    const service = new NotificationDeliveryService(
      prisma as unknown as PrismaService,
      {} as JobRunnerService,
      apprise as unknown as AppriseNotificationAdapter,
    );

    await service.deliverPending(['delivery-a']);

    expect(prisma.notificationDeliveryAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        attempt: 1,
        error: 'Apprise notification delivery failed.',
        notificationChannelId: 'channel-a',
        notificationDeliveryId: 'delivery-a',
      }),
    });
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: NotificationDeliveryStatus.PENDING }),
      where: { id: 'delivery-a' },
    });
  });
});
