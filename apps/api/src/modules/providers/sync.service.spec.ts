import type { JobRunnerService } from '../../jobs/job-runner.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { WorkflowFilterService } from '../repositories/workflow-filter.service.js';
import type { ProviderAdapterRegistry } from './provider-adapter.registry.js';
import type { ProviderCredentialService } from './provider-credential.service.js';
import { ProviderSyncService } from './sync.service.js';

describe('ProviderSyncService', () => {
  it('upserts repeated provider-native run IDs within each repository', async () => {
    const firstRepository = createRepository('first-repository');
    const secondRepository = createRepository('second-repository');
    const mocks = {
      prisma: {
        providerAccount: { update: jest.fn().mockResolvedValue(undefined) },
        repository: {
          findMany: jest.fn().mockResolvedValue([firstRepository, secondRepository]),
          update: jest.fn().mockResolvedValue(undefined),
        },
        workflowRun: { upsert: jest.fn().mockResolvedValue(undefined) },
      },
      adapter: {
        listWorkflowRuns: jest.fn().mockResolvedValue([createWorkflowRun()]),
      },
      credentials: { decrypt: jest.fn().mockReturnValue('access-token') },
      filters: { shouldTrack: jest.fn().mockReturnValue(true) },
    };
    const service = new ProviderSyncService(
      mocks.prisma as unknown as PrismaService,
      {} as JobRunnerService,
      { get: jest.fn().mockReturnValue(mocks.adapter) } as unknown as ProviderAdapterRegistry,
      mocks.credentials as unknown as ProviderCredentialService,
      mocks.filters as unknown as WorkflowFilterService,
    );

    await service.syncEnabledRepositories();
    await service.syncEnabledRepositories();

    expect(mocks.prisma.workflowRun.upsert).toHaveBeenCalledTimes(4);
    expect(mocks.prisma.workflowRun.upsert).toHaveBeenNthCalledWith(1, {
      create: { ...createWorkflowRun(), repositoryId: firstRepository.id },
      update: createWorkflowRun(),
      where: {
        repositoryId_providerRunId: {
          providerRunId: '12345',
          repositoryId: firstRepository.id,
        },
      },
    });
    expect(mocks.prisma.workflowRun.upsert).toHaveBeenNthCalledWith(2, {
      create: { ...createWorkflowRun(), repositoryId: secondRepository.id },
      update: createWorkflowRun(),
      where: {
        repositoryId_providerRunId: {
          providerRunId: '12345',
          repositoryId: secondRepository.id,
        },
      },
    });
  });
});

function createRepository(id: string) {
  return {
    id,
    lastSyncAt: null,
    name: 'flowpeek',
    owner: 'flowpeek',
    providerRepositoryId: 'repository-id',
    providerAccount: {
      baseUrl: null,
      encryptedAccessToken: 'encrypted-access-token',
      id: 'provider-account',
      providerType: 'GITHUB',
    },
    workflowFilters: [],
  };
}

function createWorkflowRun() {
  return {
    completedAt: new Date('2026-08-26T09:10:00.000Z'),
    durationMs: 60_000,
    providerCreatedAt: new Date('2026-08-26T09:09:00.000Z'),
    providerRunId: '12345',
    rawStatus: 'success',
    startedAt: new Date('2026-08-26T09:09:00.000Z'),
    status: 'SUCCESS',
    url: 'https://github.com/flowpeek/flowpeek/actions/runs/12345',
    workflowName: 'Test',
  };
}
