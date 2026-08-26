import { ForbiddenException } from '@nestjs/common';

import { CaslAbilityFactory } from '../../casl/casl-ability.factory.js';
import { NotificationChannelType } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ProviderCredentialService } from '../providers/provider-credential.service.js';
import { WorkflowFilterService } from '../repositories/workflow-filter.service.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  const user = { id: 'user-a', role: 'VIEWER' as const, username: 'viewer' };

  function createService() {
    const prisma = {
      notificationChannel: {
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      notificationRule: {
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      repositoryMembership: {
        findMany: jest.fn().mockResolvedValue([{ repositoryId: 'repository-a', role: 'VIEWER' }]),
        findUnique: jest.fn(),
      },
    };
    return {
      prisma,
      service: new NotificationsService(
        prisma as unknown as PrismaService,
        new CaslAbilityFactory(),
        {
          decrypt: jest.fn(),
          encrypt: jest.fn((secret: string) => `encrypted:${secret}`),
        } as unknown as ProviderCredentialService,
        new WorkflowFilterService(),
      ),
    };
  }

  it('limits channel lists to repositories visible through persisted memberships', async () => {
    const { prisma, service } = createService();

    await service.listChannels(user);

    expect(prisma.notificationChannel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ OR: [{ repositoryId: { in: ['repository-a'] } }] }],
        },
      }),
    );
  });

  it('requires a manager membership before creating a channel', async () => {
    const { prisma, service } = createService();
    prisma.repositoryMembership.findUnique.mockResolvedValue({ role: 'VIEWER' });

    await expect(
      service.createChannel(
        { ...user, role: 'MANAGER' },
        {
          repositoryId: 'repository-a',
          name: 'On-call',
          type: NotificationChannelType.GOTIFY,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('encrypts Gotify credentials while preserving only non-secret channel configuration', async () => {
    const { prisma, service } = createService();
    prisma.repositoryMembership.findUnique.mockResolvedValue({ role: 'MANAGER' });
    prisma.notificationChannel.create.mockResolvedValue({});

    await service.createChannel(
      { ...user, role: 'MANAGER' },
      {
        repositoryId: 'repository-a',
        name: 'On-call',
        type: NotificationChannelType.GOTIFY,
        configuration: { serverUrl: 'https://gotify.example.test' },
        secret: 'gotify-token',
      },
    );

    expect(prisma.notificationChannel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        configuration: { serverUrl: 'https://gotify.example.test' },
        encryptedSecret: 'encrypted:gotify-token',
      }),
    });
  });

  it('creates a workflow glob rule linked only to channels from its repository', async () => {
    const { prisma, service } = createService();
    prisma.repositoryMembership.findUnique.mockResolvedValue({ role: 'MANAGER' });
    prisma.notificationChannel.findMany.mockResolvedValue([{ id: '11111111-1111-4111-8111-111111111111' }]);
    prisma.notificationRule.create.mockResolvedValue({});

    await service.createRule(
      { ...user, role: 'MANAGER' },
      {
        repositoryId: 'repository-a',
        workflowPattern: 'Deploy*',
        outcome: 'FAILED',
        channelIds: ['11111111-1111-4111-8111-111111111111'],
      },
    );

    expect(prisma.notificationRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channelLinks: {
            createMany: { data: [{ notificationChannelId: '11111111-1111-4111-8111-111111111111' }] },
          },
          outcome: 'FAILED',
          workflowPattern: 'Deploy*',
        }),
      }),
    );
  });
});
