import type { JobRunnerService } from '../../jobs/job-runner.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { WorkflowFilterService } from '../repositories/workflow-filter.service.js';
import type { SystemStatusService } from '../system-status/system-status.service.js';
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
        workflowRun: {
          findMany: jest.fn().mockResolvedValue([{ providerRunId: '12345' }]),
          upsert: jest.fn(({ create }) => Promise.resolve({ id: 'run-id', ...create })),
        },
      },
      adapter: {
        getWorkflowRun: jest.fn().mockResolvedValue(createWorkflowRun()),
        listWorkflowRuns: jest.fn().mockResolvedValue([createWorkflowRun()]),
      },
      credentials: { decrypt: jest.fn().mockReturnValue('access-token') },
      filters: { shouldTrack: jest.fn().mockReturnValue(true) },
      notifications: { evaluateRulesForRun: jest.fn().mockResolvedValue([]) },
      status: {
        beginProviderSync: jest.fn().mockReturnValue('sync-id'),
        finishProviderSync: jest.fn(),
        refreshRunningWorkflowCount: jest.fn().mockResolvedValue(undefined),
        updateProviderSync: jest.fn(),
      },
    };
    const service = new ProviderSyncService(
      mocks.prisma as unknown as PrismaService,
      {} as JobRunnerService,
      { get: jest.fn().mockReturnValue(mocks.adapter) } as unknown as ProviderAdapterRegistry,
      mocks.credentials as unknown as ProviderCredentialService,
      mocks.filters as unknown as WorkflowFilterService,
      mocks.notifications as unknown as NotificationsService,
      mocks.status as unknown as SystemStatusService,
    );

    await service.syncEnabledRepositories();
    await service.syncEnabledRepositories();

    expect(mocks.prisma.workflowRun.upsert).toHaveBeenCalledTimes(4);
    expect(mocks.adapter.getWorkflowRun).toHaveBeenCalledTimes(4);
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
    expect(mocks.notifications.evaluateRulesForRun).toHaveBeenCalledTimes(4);
    expect(mocks.status.refreshRunningWorkflowCount).toHaveBeenCalledTimes(4);
    expect(mocks.status.updateProviderSync).toHaveBeenCalledWith('sync-id', {
      phase: 'PROCESSING_WORKFLOWS',
      repositoriesCompleted: 0,
      repositoriesTotal: 2,
      workflowRunsCompleted: 0,
      workflowRunsTotal: 1,
    });
    expect(mocks.status.finishProviderSync).toHaveBeenCalledTimes(2);
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
    awaitingApproval: false,
    completedAt: new Date('2026-08-26T09:10:00.000Z'),
    durationMs: 60_000,
    providerCreatedAt: new Date('2026-08-26T09:09:00.000Z'),
    providerRunId: '12345',
    rawStatus: 'success',
    reviewUrl: null,
    startedAt: new Date('2026-08-26T09:09:00.000Z'),
    status: 'SUCCESS',
    url: 'https://github.com/flowpeek/flowpeek/actions/runs/12345',
    workflowName: 'Test',
  };
}
