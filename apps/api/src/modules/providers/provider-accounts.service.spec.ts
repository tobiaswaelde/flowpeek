import { ForbiddenException } from '@nestjs/common';

import { ProviderAccountsService } from './provider-accounts.service.js';

describe('ProviderAccountsService', () => {
  const prisma = {
    providerAccount: {
      create: jest.fn().mockResolvedValue({ id: 'provider-id' }),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const credentials = { encrypt: jest.fn((value: string) => `encrypted:${value}`) };
  const service = new ProviderAccountsService(prisma as never, credentials as never);
  const admin = { id: 'admin', role: 'SYSTEM_ADMIN' as const, username: 'admin' };

  beforeEach(() => jest.clearAllMocks());

  it('encrypts write-only provider credentials before persistence', async () => {
    await service.create(admin, {
      accessToken: 'access-token',
      displayName: 'GitHub',
      providerType: 'GITHUB',
      webhookSecret: 'webhook-secret',
    });

    expect(credentials.encrypt).toHaveBeenCalledWith('access-token');
    expect(credentials.encrypt).toHaveBeenCalledWith('webhook-secret');
    expect(prisma.providerAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ encryptedAccessToken: 'encrypted:access-token' }) }),
    );
  });

  it('rejects non-administrators before querying provider accounts', async () => {
    await expect(service.list({ id: 'viewer', role: 'VIEWER', username: 'viewer' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.providerAccount.findMany).not.toHaveBeenCalled();
  });
});
