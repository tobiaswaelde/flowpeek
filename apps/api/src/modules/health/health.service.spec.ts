import type { PrismaService } from '../../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  it('returns the last persisted provider sync state without exposing errors', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      providerAccount: {
        findMany: jest.fn().mockResolvedValue([
          {
            displayName: 'GitHub',
            enabled: true,
            id: 'github-account',
            lastSyncAt: new Date('2026-08-26T08:30:00.000Z'),
            lastSyncError: null,
            providerType: 'GITHUB',
          },
          {
            displayName: 'GitLab',
            enabled: true,
            id: 'gitlab-account',
            lastSyncAt: new Date('2026-08-26T08:31:00.000Z'),
            lastSyncError: 'Credential was rejected.',
            providerType: 'GITLAB',
          },
        ]),
      },
    } as unknown as PrismaService;

    await expect(new HealthService(prisma).getHealth()).resolves.toEqual({
      api: 'ok',
      database: 'ok',
      providers: [
        {
          displayName: 'GitHub',
          enabled: true,
          id: 'github-account',
          lastSyncAt: new Date('2026-08-26T08:30:00.000Z'),
          providerType: 'GITHUB',
          syncStatus: 'healthy',
        },
        {
          displayName: 'GitLab',
          enabled: true,
          id: 'gitlab-account',
          lastSyncAt: new Date('2026-08-26T08:31:00.000Z'),
          providerType: 'GITLAB',
          syncStatus: 'failed',
        },
      ],
      status: 'degraded',
    });
    expect(prisma.providerAccount.findMany).toHaveBeenCalledWith({
      orderBy: { displayName: 'asc' },
      select: {
        displayName: true,
        enabled: true,
        id: true,
        lastSyncAt: true,
        lastSyncError: true,
        providerType: true,
      },
    });
  });

  it('reports a degraded response when the database is unavailable', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('Connection refused')),
      providerAccount: { findMany: jest.fn() },
    } as unknown as PrismaService;

    await expect(new HealthService(prisma).getHealth()).resolves.toEqual({
      api: 'ok',
      database: 'error',
      providers: [],
      status: 'degraded',
    });
    expect(prisma.providerAccount.findMany).not.toHaveBeenCalled();
  });
});
