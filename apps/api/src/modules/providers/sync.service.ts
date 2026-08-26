import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { ENV } from '../../config/env.js';
import type { ProviderType } from '../../generated/prisma/client.js';
import { JobRunnerService } from '../../jobs/job-runner.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { WorkflowFilterService } from '../repositories/workflow-filter.service.js';
import { ProviderAdapterRegistry } from './provider-adapter.registry.js';
import { ProviderCredentialService } from './provider-credential.service.js';

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
    private readonly filters: WorkflowFilterService,
  ) {}

  @Interval(ENV.SCHEDULER_SYNC_INTERVAL_SECONDS * 1000)
  async scheduleSync(): Promise<void> {
    await this.jobs.run('provider-sync', () => this.syncEnabledRepositories());
  }

  async syncEnabledRepositories(): Promise<void> {
    const repositories = await this.prisma.repository.findMany({
      where: { enabled: true, providerAccount: { enabled: true } },
      include: { providerAccount: true, workflowFilters: true },
    });
    for (const repository of repositories) await this.syncRepository(repository);
  }

  private async syncRepository(
    repository: Awaited<ReturnType<PrismaService['repository']['findMany']>>[number] & {
      providerAccount: { id: string; providerType: ProviderType; baseUrl: string | null; encryptedAccessToken: string };
      workflowFilters: { mode: 'ALLOW' | 'DENY'; pattern: string }[];
    },
  ): Promise<void> {
    try {
      const adapter = this.adapters.get(repository.providerAccount.providerType);
      const runs = await withProviderRetries(() =>
        adapter.listWorkflowRuns(
          {
            providerAccountId: repository.providerAccount.id,
            baseUrl: repository.providerAccount.baseUrl,
            accessToken: this.credentials.decrypt(repository.providerAccount.encryptedAccessToken),
          },
          repository,
          repository.lastSyncAt ?? undefined,
        ),
      );
      for (const run of runs)
        if (this.filters.shouldTrack(run.workflowName, repository.workflowFilters))
          await this.prisma.workflowRun.upsert({
            where: { repositoryId_providerRunId: { repositoryId: repository.id, providerRunId: run.providerRunId } },
            create: { ...run, repositoryId: repository.id },
            update: { ...run },
          });
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
  }
}
