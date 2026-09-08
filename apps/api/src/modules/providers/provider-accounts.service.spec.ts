import { BadRequestException, ForbiddenException } from '@nestjs/common';

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
  const adapters = { get: jest.fn(() => ({ validateAccount: jest.fn().mockResolvedValue({ valid: true }) })) };
  const service = new ProviderAccountsService(prisma as never, credentials as never, adapters as never);
  const admin = { id: 'admin', role: 'SYSTEM_ADMIN' as const, username: 'admin' };

  beforeEach(() => jest.clearAllMocks());

  it('encrypts OAuth provider credentials before persistence', async () => {
    await service.createFromOAuth(admin, {
      accessToken: 'access-token',
      displayName: 'GitHub',
      providerType: 'GITHUB',
    });

    expect(credentials.encrypt).toHaveBeenCalledWith('access-token');
    expect(adapters.get).toHaveBeenCalledWith('GITHUB');
    expect(prisma.providerAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ encryptedAccessToken: 'encrypted:access-token' }) }),
    );
  });

  it('encrypts manually supplied provider tokens before persistence', async () => {
    await service.create(admin, {
      accessToken: 'personal-access-token',
      displayName: 'GitLab',
      providerType: 'GITLAB',
    });

    expect(credentials.encrypt).toHaveBeenCalledWith('personal-access-token');
    expect(prisma.providerAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ encryptedAccessToken: 'encrypted:personal-access-token' }),
      }),
    );
  });

  it('requires and encrypts the Gitea base URL and personal access token', async () => {
    await expect(
      service.create(admin, { accessToken: 'token', displayName: 'Gitea', providerType: 'GITEA' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.create(admin, {
      accessToken: 'token',
      baseUrl: 'https://gitea.example.test',
      displayName: 'Gitea',
      providerType: 'GITEA',
    });

    expect(prisma.providerAccount.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          baseUrl: 'https://gitea.example.test',
          encryptedAccessToken: 'encrypted:token',
          providerType: 'GITEA',
        }),
      }),
    );
  });

  it('rejects non-administrators before querying provider accounts', async () => {
    await expect(service.list({ id: 'viewer', role: 'VIEWER', username: 'viewer' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.providerAccount.findMany).not.toHaveBeenCalled();
  });

  it('does not persist a provider account when its credentials cannot be validated', async () => {
    adapters.get.mockReturnValueOnce({ validateAccount: jest.fn().mockRejectedValue(new Error('Unauthorized')) });

    await expect(
      service.create(admin, {
        accessToken: 'invalid-token',
        displayName: 'GitHub',
        providerType: 'GITHUB',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.providerAccount.create).not.toHaveBeenCalled();
    expect(credentials.encrypt).not.toHaveBeenCalled();
  });
});
