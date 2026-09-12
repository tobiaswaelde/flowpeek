import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { ENV } from '../../config/env.js';
import type { ProviderType } from '../../generated/prisma/client.js';
import { JobRunnerService } from '../../jobs/job-runner.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { WorkflowFilterService } from '../repositories/workflow-filter.service.js';
import { SystemStatusService } from '../system-status/system-status.service.js';
import type {
  ProviderAccountContext,
  ProviderAdapter,
  ProviderRepositoryReference,
  ProviderWorkflowRun,
} from './provider-adapter.js';
import { ProviderAdapterRegistry } from './provider-adapter.registry.js';
import { ProviderCredentialService } from './provider-credential.service.js';
import { RepositoryMetadataService } from './repository-metadata.service.js';

const terminalWorkflowRunStatuses = ['SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED', 'UNKNOWN'] as const;
const closedChangeRequestRefreshIntervalMs = 24 * 60 * 60 * 1000;
const unknownChangeRequestRefreshIntervalMs = 60 * 60 * 1000;

/** Retries transient provider operations with bounded exponential backoff. */
export async function withProviderRetries<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
  let error: unknown;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await operation();
    } catch (caught) {
      error = caught;
      if (attempt + 1 < retries) await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
    }
  }
  throw error;
}

/** Incrementally synchronizes enabled tracked repositories without provider writes. */
@Injectable()
export class ProviderSyncService {
  private readonly logger = new Logger(ProviderSyncService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobRunnerService,
    private readonly adapters: ProviderAdapterRegistry,
    private readonly credentials: ProviderCredentialService,
    private readonly metadata: RepositoryMetadataService,
    private readonly filters: WorkflowFilterService,
    private readonly notifications: NotificationsService,
    private readonly status: SystemStatusService,
  ) {}

  @Interval(ENV.SCHEDULER_SYNC_INTERVAL_SECONDS * 1000)
  async scheduleSync(): Promise<void> {
    await this.jobs.run('provider-sync', () => this.syncEnabledRepositories());
  }

  async syncEnabledRepositories(): Promise<void> {
    const syncId = this.status.beginProviderSync();
    try {
      const repositories = await this.prisma.repository.findMany({
        where: { enabled: true, providerAccount: { enabled: true } },
        include: { providerAccount: true, workflowFilters: true },
      });
      for (const [index, repository] of repositories.entries()) {
        await this.syncRepository(repository, {
          id: syncId,
          repositoriesCompleted: index,
          repositoriesTotal: repositories.length,
        });
        this.status.updateProviderSync(syncId, {
          phase: 'FETCHING_WORKFLOWS',
          repositoriesCompleted: index + 1,
          repositoriesTotal: repositories.length,
          workflowRunsCompleted: null,
          workflowRunsTotal: null,
        });
      }
    } finally {
      this.status.finishProviderSync(syncId);
    }
  }

  /**
   * Synchronize one enabled repository after a verified provider webhook.
   *
   * @param providerAccountId - Configured account that received the webhook.
   * @param providerRepositoryId - Provider-native repository identifier from the webhook.
   * @returns Whether the webhook referenced a tracked enabled repository.
   */
  async syncRepositoryByProviderReference(providerAccountId: string, providerRepositoryId: string): Promise<boolean> {
    const syncId = this.status.beginProviderSync();
    try {
      const repository = await this.prisma.repository.findFirst({
        where: {
          enabled: true,
          providerAccountId,
          providerRepositoryId,
          providerAccount: { enabled: true },
        },
        include: { providerAccount: true, workflowFilters: true },
      });
      if (!repository) return false;

      await this.syncRepository(repository, { id: syncId, repositoriesCompleted: 0, repositoriesTotal: 1 });
      this.status.updateProviderSync(syncId, {
        phase: 'FETCHING_WORKFLOWS',
        repositoriesCompleted: 1,
        repositoriesTotal: 1,
        workflowRunsCompleted: null,
        workflowRunsTotal: null,
      });
      return true;
    } finally {
      this.status.finishProviderSync(syncId);
    }
  }

  private async syncRepository(
    repository: Awaited<ReturnType<PrismaService['repository']['findMany']>>[number] & {
      providerAccount: { id: string; providerType: ProviderType; baseUrl: string | null; encryptedAccessToken: string };
      workflowFilters: { mode: 'ALLOW' | 'DENY'; pattern: string }[];
    },
    progress: { id: string; repositoriesCompleted: number; repositoriesTotal: number },
  ): Promise<void> {
    this.status.updateProviderSync(progress.id, {
      phase: 'FETCHING_WORKFLOWS',
      repositoriesCompleted: progress.repositoriesCompleted,
      repositoriesTotal: progress.repositoriesTotal,
      workflowRunsCompleted: null,
      workflowRunsTotal: null,
    });
    try {
      const refreshedRepository = await this.metadata.refresh(repository);
      const adapter = this.adapters.get(refreshedRepository.providerAccount.providerType);
      const context = {
        providerAccountId: refreshedRepository.providerAccount.id,
        baseUrl: refreshedRepository.providerAccount.baseUrl,
        accessToken: this.credentials.decrypt(refreshedRepository.providerAccount.encryptedAccessToken),
      };
      const discoveredRuns = await withProviderRetries(() =>
        adapter.listWorkflowRuns(context, refreshedRepository, refreshedRepository.lastSyncAt ?? undefined),
      );
      const currentRuns = await this.prisma.workflowRun.findMany({
        distinct: ['workflowId', 'scopeKey'],
        orderBy: [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
        select: { awaitingApproval: true, providerRunId: true, status: true },
        where: {
          repositoryId: repository.id,
        },
      });
      const activeRuns = currentRuns.filter(
        (run) => run.awaitingApproval || run.status === 'QUEUED' || run.status === 'RUNNING',
      );
      const refreshedRuns = await Promise.all(
        activeRuns.map(({ providerRunId }) =>
          withProviderRetries(() => adapter.getWorkflowRun(context, refreshedRepository, providerRunId)),
        ),
      );
      const runsByProviderId = new Map(discoveredRuns.map((run) => [run.providerRunId, run]));
      for (const run of refreshedRuns) if (run) runsByProviderId.set(run.providerRunId, run);
      const runs = [...runsByProviderId.values()];
      this.status.updateProviderSync(progress.id, {
        phase: 'PROCESSING_WORKFLOWS',
        repositoriesCompleted: progress.repositoriesCompleted,
        repositoriesTotal: progress.repositoriesTotal,
        workflowRunsCompleted: 0,
        workflowRunsTotal: runs.length,
      });
      for (const [index, run] of runs.entries()) {
        if (this.filters.shouldTrack(run.workflowName, repository.workflowFilters))
          await this.persistRunAndEvaluateRules(repository.id, run);
        this.status.updateProviderSync(progress.id, {
          phase: 'PROCESSING_WORKFLOWS',
          repositoriesCompleted: progress.repositoriesCompleted,
          repositoriesTotal: progress.repositoriesTotal,
          workflowRunsCompleted: index + 1,
          workflowRunsTotal: runs.length,
        });
      }
      await this.refreshChangeRequestStates(context, refreshedRepository, adapter);
      await this.prisma.repository.update({ where: { id: repository.id }, data: { lastSyncAt: new Date() } });
      await this.prisma.providerAccount.update({
        where: { id: repository.providerAccount.id },
        data: { lastSyncAt: new Date(), lastSyncError: null },
      });
    } catch {
      await this.prisma.providerAccount.update({
        where: { id: repository.providerAccount.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncError: 'Synchronization failed. Check provider connectivity and credentials.',
        },
      });
      this.logger.warn(`Synchronization failed for provider account ${repository.providerAccount.id}.`);
    }
    await this.status.refreshRunningWorkflowCount();
  }

  /** Refresh lifecycle metadata for change requests whose current terminal workflow result still failed. */
  private async refreshChangeRequestStates(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference & { id: string },
    adapter: ProviderAdapter,
  ): Promise<void> {
    const latestTerminalRuns = await this.prisma.workflowRun.findMany({
      distinct: ['workflowId', 'scopeKey'],
      orderBy: [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
      select: {
        changeRequestCheckedAt: true,
        changeRequestNumber: true,
        changeRequestState: true,
        status: true,
      },
      where: {
        awaitingApproval: false,
        changeRequestNumber: { not: null },
        completedAt: { not: null },
        repositoryId: repository.id,
        status: { in: [...terminalWorkflowRunStatuses] },
        workflow: { kind: 'STANDARD' },
      },
    });
    const now = new Date();
    const candidates = new Map<string, (typeof latestTerminalRuns)[number]>();
    for (const run of latestTerminalRuns) {
      if (run.status !== 'FAILED' || !run.changeRequestNumber) continue;
      const existing = candidates.get(run.changeRequestNumber);
      if (!existing || (!this.shouldRefreshChangeRequest(existing, now) && this.shouldRefreshChangeRequest(run, now)))
        candidates.set(run.changeRequestNumber, run);
    }

    for (const [changeRequestNumber, candidate] of candidates) {
      if (!this.shouldRefreshChangeRequest(candidate, now)) continue;
      try {
        const state = await withProviderRetries(() =>
          adapter.getChangeRequestState(context, repository, changeRequestNumber),
        );
        await this.prisma.workflowRun.updateMany({
          data: {
            changeRequestCheckedAt: now,
            changeRequestMergedAt: state?.mergedAt ?? null,
            changeRequestState: state?.state ?? 'UNKNOWN',
            changeRequestTargetBranch: state?.targetBranch ?? null,
          },
          where: { changeRequestNumber, repositoryId: repository.id },
        });
      } catch {
        await this.prisma.workflowRun.updateMany({
          data: {
            changeRequestCheckedAt: now,
            changeRequestMergedAt: null,
            changeRequestState: 'UNKNOWN',
            changeRequestTargetBranch: null,
          },
          where: { changeRequestNumber, repositoryId: repository.id },
        });
        this.logger.warn(
          `Change-request status refresh failed for repository ${repository.id} and change request ${changeRequestNumber}.`,
        );
      }
    }
  }

  /** Decide whether cached change-request lifecycle metadata is old enough to refresh. */
  private shouldRefreshChangeRequest(
    candidate: { changeRequestCheckedAt: Date | null; changeRequestState: 'UNKNOWN' | 'OPEN' | 'CLOSED' | 'MERGED' },
    now: Date,
  ): boolean {
    if (candidate.changeRequestState === 'MERGED') return false;
    if (candidate.changeRequestState === 'OPEN' || !candidate.changeRequestCheckedAt) return true;
    const refreshInterval =
      candidate.changeRequestState === 'CLOSED'
        ? closedChangeRequestRefreshIntervalMs
        : unknownChangeRequestRefreshIntervalMs;
    return now.getTime() - candidate.changeRequestCheckedAt.getTime() >= refreshInterval;
  }

  private async persistRunAndEvaluateRules(repositoryId: string, run: ProviderWorkflowRun): Promise<void> {
    const { providerWorkflowId, workflowKind, workflowPath, ...runData } = run;
    const lastSeenAt = new Date();
    const workflow = await this.prisma.workflow.upsert({
      where: { repositoryId_providerWorkflowId: { repositoryId, providerWorkflowId } },
      create: {
        kind: workflowKind,
        lastSeenAt,
        name: run.workflowName,
        path: workflowPath,
        providerWorkflowId,
        repositoryId,
      },
      update: {
        kind: workflowKind,
        lastSeenAt,
        name: run.workflowName,
        path: workflowPath,
      },
    });
    await this.consolidateLegacyWorkflow(repositoryId, run, workflow.id);
    const workflowRun = await this.prisma.workflowRun.upsert({
      where: { repositoryId_providerRunId: { repositoryId, providerRunId: run.providerRunId } },
      create: { ...runData, repositoryId, workflowId: workflow.id },
      update: { ...runData, workflowId: workflow.id },
    });
    await this.notifications.evaluateRulesForRun(workflowRun);
  }

  private async consolidateLegacyWorkflow(
    repositoryId: string,
    run: ProviderWorkflowRun,
    workflowId: string,
  ): Promise<void> {
    const legacyProviderWorkflowId =
      run.workflowKind === 'DEPENDABOT_INTERNAL'
        ? 'github:dynamic/dependabot/dependabot-updates'
        : `legacy:name:${run.workflowName}`;
    if (legacyProviderWorkflowId === run.providerWorkflowId) return;

    const legacyWorkflow = await this.prisma.workflow.findUnique({
      where: {
        repositoryId_providerWorkflowId: { providerWorkflowId: legacyProviderWorkflowId, repositoryId },
      },
    });
    if (!legacyWorkflow || legacyWorkflow.id === workflowId) return;

    await this.prisma.workflowRun.updateMany({
      data: { scopeKey: run.scopeKey, workflowId },
      where: { workflowId: legacyWorkflow.id },
    });
    await this.prisma.workflow.delete({ where: { id: legacyWorkflow.id } });
  }
}
