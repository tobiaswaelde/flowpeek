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
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          upsert: jest.fn(({ create }) => Promise.resolve({ id: 'run-id', ...create })),
        },
        workflow: {
          delete: jest.fn().mockResolvedValue(undefined),
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest.fn().mockResolvedValue({ id: 'workflow-id' }),
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

    const { providerWorkflowId, workflowKind, workflowPath, ...persistedRun } = createWorkflowRun();
    expect(mocks.prisma.workflow.upsert).toHaveBeenCalledTimes(4);
    expect(mocks.prisma.workflow.upsert).toHaveBeenNthCalledWith(1, {
      create: {
        kind: workflowKind,
        lastSeenAt: expect.any(Date),
        name: persistedRun.workflowName,
        path: workflowPath,
        providerWorkflowId,
        repositoryId: firstRepository.id,
      },
      update: {
        kind: workflowKind,
        lastSeenAt: expect.any(Date),
        name: persistedRun.workflowName,
        path: workflowPath,
      },
      where: {
        repositoryId_providerWorkflowId: {
          providerWorkflowId,
          repositoryId: firstRepository.id,
        },
      },
    });
    expect(mocks.prisma.workflowRun.upsert).toHaveBeenCalledTimes(4);
    expect(mocks.prisma.workflowRun.updateMany).not.toHaveBeenCalled();
    expect(mocks.prisma.workflow.delete).not.toHaveBeenCalled();
    expect(mocks.adapter.getWorkflowRun).toHaveBeenCalledTimes(4);
    expect(mocks.prisma.workflowRun.upsert).toHaveBeenNthCalledWith(1, {
      create: { ...persistedRun, repositoryId: firstRepository.id, workflowId: 'workflow-id' },
      update: { ...persistedRun, workflowId: 'workflow-id' },
      where: {
        repositoryId_providerRunId: {
          providerRunId: '12345',
          repositoryId: firstRepository.id,
        },
      },
    });
    expect(mocks.prisma.workflowRun.upsert).toHaveBeenNthCalledWith(2, {
      create: { ...persistedRun, repositoryId: secondRepository.id, workflowId: 'workflow-id' },
      update: { ...persistedRun, workflowId: 'workflow-id' },
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

  it('moves migrated name-based runs to their provider-native workflow on first observation', async () => {
    const repository = createRepository('repository');
    const run = createWorkflowRun();
    const prisma = {
      providerAccount: { update: jest.fn().mockResolvedValue(undefined) },
      repository: {
        findMany: jest.fn().mockResolvedValue([repository]),
        update: jest.fn().mockResolvedValue(undefined),
      },
      workflow: {
        delete: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue({ id: 'legacy-workflow-id' }),
        upsert: jest.fn().mockResolvedValue({ id: 'provider-workflow-id' }),
      },
      workflowRun: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
        upsert: jest.fn(({ create }) => Promise.resolve({ id: 'run-id', ...create })),
      },
    };
    const status = {
      beginProviderSync: jest.fn().mockReturnValue('sync-id'),
      finishProviderSync: jest.fn(),
      refreshRunningWorkflowCount: jest.fn().mockResolvedValue(undefined),
      updateProviderSync: jest.fn(),
    };
    const service = new ProviderSyncService(
      prisma as unknown as PrismaService,
      {} as JobRunnerService,
      {
        get: jest.fn().mockReturnValue({
          getWorkflowRun: jest.fn(),
          listWorkflowRuns: jest.fn().mockResolvedValue([run]),
        }),
      } as unknown as ProviderAdapterRegistry,
      { decrypt: jest.fn().mockReturnValue('access-token') } as unknown as ProviderCredentialService,
      { shouldTrack: jest.fn().mockReturnValue(true) } as unknown as WorkflowFilterService,
      { evaluateRulesForRun: jest.fn().mockResolvedValue([]) } as unknown as NotificationsService,
      status as unknown as SystemStatusService,
    );

    await service.syncEnabledRepositories();

    expect(prisma.workflow.findUnique).toHaveBeenCalledWith({
      where: {
        repositoryId_providerWorkflowId: {
          providerWorkflowId: 'legacy:name:Test',
          repositoryId: repository.id,
        },
      },
    });
    expect(prisma.workflowRun.updateMany).toHaveBeenCalledWith({
      data: { scopeKey: 'branch:main', workflowId: 'provider-workflow-id' },
      where: { workflowId: 'legacy-workflow-id' },
    });
    expect(prisma.workflow.delete).toHaveBeenCalledWith({ where: { id: 'legacy-workflow-id' } });
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
    changeRequestNumber: null,
    completedAt: new Date('2026-08-26T09:10:00.000Z'),
    displayTitle: 'Test on main',
    durationMs: 60_000,
    event: 'push',
    headBranch: 'main',
    headSha: '0123456789abcdef',
    providerCreatedAt: new Date('2026-08-26T09:09:00.000Z'),
    providerRunId: '12345',
    providerWorkflowId: '17',
    rawStatus: 'success',
    reviewUrl: null,
    scopeKey: 'branch:main',
    startedAt: new Date('2026-08-26T09:09:00.000Z'),
    status: 'SUCCESS',
    url: 'https://github.com/flowpeek/flowpeek/actions/runs/12345',
    workflowKind: 'STANDARD',
    workflowName: 'Test',
    workflowPath: '.github/workflows/test.yml',
  };
}
