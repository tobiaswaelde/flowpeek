import { UnauthorizedException } from '@nestjs/common';

import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ProviderAdapterRegistry } from '../providers/provider-adapter.registry.js';
import type { ProviderCredentialService } from '../providers/provider-credential.service.js';
import type { ProviderSyncService } from '../providers/sync.service.js';
import { WebhookService } from './webhook.service.js';

describe('WebhookService', () => {
  const payload = Buffer.from('{"repository":{"id":42}}');

  it('records a verified delivery once and asynchronously targets its tracked repository', async () => {
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
    expect(mocks.prisma.webhookDelivery.create).toHaveBeenCalledWith({
      data: {
        deliveryId: 'delivery-id',
        event: 'workflow_run',
        providerAccountId: 'account-id',
        providerRepositoryId: '42',
      },
    });
    expect(mocks.sync.syncRepositoryByProviderReference).toHaveBeenCalledWith('account-id', '42');
  });

  it('accepts a repeated verified delivery without scheduling it again', async () => {
    const mocks = createMocks();
    mocks.prisma.providerAccount.findUnique.mockResolvedValue({
      enabled: true,
      encryptedWebhookSecret: 'encrypted-secret',
      providerType: 'GITLAB',
    });
    mocks.adapter.verifyWebhook.mockResolvedValue({ event: 'Pipeline Hook', providerRepositoryId: '42' });
    mocks.prisma.webhookDelivery.create.mockRejectedValue({ code: 'P2002' });
    const service = createService(mocks);

    await expect(
      service.receive('GITLAB', 'account-id', {
        headers: { 'x-gitlab-event-uuid': 'delivery-id' },
        payload,
      }),
    ).resolves.toEqual({ accepted: true, duplicate: true });
    expect(mocks.sync.syncRepositoryByProviderReference).not.toHaveBeenCalled();
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
  return {
    adapter: { verifyWebhook: jest.fn() },
    credentials: { decrypt: jest.fn().mockReturnValue('webhook-secret') },
    prisma: {
      providerAccount: { findUnique: jest.fn() },
      webhookDelivery: { create: jest.fn().mockResolvedValue(undefined) },
    },
    sync: { syncRepositoryByProviderReference: jest.fn().mockResolvedValue(true) },
  };
}

function createService(mocks: ReturnType<typeof createMocks>): WebhookService {
  return new WebhookService(
    mocks.prisma as unknown as PrismaService,
    { get: jest.fn().mockReturnValue(mocks.adapter) } as unknown as ProviderAdapterRegistry,
    mocks.credentials as unknown as ProviderCredentialService,
    mocks.sync as unknown as ProviderSyncService,
  );
}
