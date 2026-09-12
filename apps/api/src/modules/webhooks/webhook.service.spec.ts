import { UnauthorizedException } from '@nestjs/common';

import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ProviderAdapterRegistry } from '../providers/provider-adapter.registry.js';
import type { ProviderCredentialService } from '../providers/provider-credential.service.js';
import type { ProviderSyncQueueService } from '../providers/sync-queue.service.js';
import { WebhookService } from './webhook.service.js';

describe('WebhookService', () => {
  const payload = Buffer.from('{"repository":{"id":42}}');

  it('records a verified delivery and queues its repository in one transaction', async () => {
    const mocks = createMocks();
    mocks.prisma.providerAccount.findUnique.mockResolvedValue({
      enabled: true,
      encryptedWebhookSecret: 'encrypted-secret',
      providerType: 'GITHUB',
    });
    mocks.adapter.verifyWebhook.mockResolvedValue({ event: 'workflow_run', providerRepositoryId: '42' });
    const service = createService(mocks);

    await expect(
      service.receive('GITHUB', 'account-id', {
        headers: { 'x-github-delivery': 'delivery-id' },
        payload,
      }),
    ).resolves.toEqual({ accepted: true, duplicate: false });
    expect(mocks.credentials.decrypt).toHaveBeenCalledWith('encrypted-secret');
    expect(mocks.transaction.webhookDelivery.create).toHaveBeenCalledWith({
      data: {
        deliveryId: 'delivery-id',
        event: 'workflow_run',
        providerAccountId: 'account-id',
        providerRepositoryId: '42',
      },
    });
    expect(mocks.syncQueue.enqueueWebhookRepository).toHaveBeenCalledWith('account-id', '42', mocks.transaction);
  });

  it('accepts a repeated verified delivery without scheduling it again', async () => {
    const mocks = createMocks();
    mocks.prisma.providerAccount.findUnique.mockResolvedValue({
      enabled: true,
      encryptedWebhookSecret: 'encrypted-secret',
      providerType: 'GITLAB',
    });
    mocks.adapter.verifyWebhook.mockResolvedValue({ event: 'Pipeline Hook', providerRepositoryId: '42' });
    mocks.transaction.webhookDelivery.create.mockRejectedValue({ code: 'P2002' });
    const service = createService(mocks);

    await expect(
      service.receive('GITLAB', 'account-id', {
        headers: { 'x-gitlab-event-uuid': 'delivery-id' },
        payload,
      }),
    ).resolves.toEqual({ accepted: true, duplicate: true });
    expect(mocks.syncQueue.enqueueWebhookRepository).not.toHaveBeenCalled();
  });

  it('uses the native Gitea delivery ID for idempotent synchronization', async () => {
    const mocks = createMocks();
    mocks.prisma.providerAccount.findUnique.mockResolvedValue({
      enabled: true,
      encryptedWebhookSecret: 'encrypted-secret',
      providerType: 'GITEA',
    });
    mocks.adapter.verifyWebhook.mockResolvedValue({ event: 'workflow_run', providerRepositoryId: '42' });

    await expect(
      createService(mocks).receive('GITEA', 'account-id', {
        headers: { 'x-gitea-delivery': 'delivery-id' },
        payload,
      }),
    ).resolves.toEqual({ accepted: true, duplicate: false });
    expect(mocks.transaction.webhookDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deliveryId: 'delivery-id' }) }),
    );
  });

  it('rejects a request without a configured account secret', async () => {
    const mocks = createMocks();
    mocks.prisma.providerAccount.findUnique.mockResolvedValue({
      enabled: true,
      encryptedWebhookSecret: null,
      providerType: 'FORGEJO',
    });

    await expect(
      createService(mocks).receive('FORGEJO', 'account-id', {
        headers: { 'x-gitea-delivery': 'delivery-id' },
        payload,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mocks.adapter.verifyWebhook).not.toHaveBeenCalled();
  });
});

function createMocks() {
  const transaction = { webhookDelivery: { create: jest.fn().mockResolvedValue(undefined) } };
  return {
    adapter: { verifyWebhook: jest.fn() },
    credentials: { decrypt: jest.fn().mockReturnValue('webhook-secret') },
    prisma: {
      providerAccount: { findUnique: jest.fn() },
      transaction: jest.fn((callback) => callback(transaction)),
    },
    syncQueue: { enqueueWebhookRepository: jest.fn().mockResolvedValue(true) },
    transaction,
  };
}

function createService(mocks: ReturnType<typeof createMocks>): WebhookService {
  return new WebhookService(
    mocks.prisma as unknown as PrismaService,
    { get: jest.fn().mockReturnValue(mocks.adapter) } as unknown as ProviderAdapterRegistry,
    mocks.credentials as unknown as ProviderCredentialService,
    mocks.syncQueue as unknown as ProviderSyncQueueService,
  );
}
