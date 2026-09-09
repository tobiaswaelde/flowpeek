import { randomUUID } from 'node:crypto';

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { ProviderSyncActivity, ProviderSyncActivityUpdate, SystemStatusSnapshot } from './system-status.types.js';

interface ActiveProviderSync extends ProviderSyncActivity {
  sequence: number;
}

/** Maintains and publishes safe global operational status for connected clients. */
@Injectable()
export class SystemStatusService implements OnModuleInit {
  private readonly logger = new Logger(SystemStatusService.name);
  private readonly changes = new Subject<SystemStatusSnapshot>();
  private readonly providerSyncs = new Map<string, ActiveProviderSync>();
  private runningWorkflowCount = 0;
  private sequence = 0;

  readonly changes$ = this.changes.asObservable();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.refreshRunningWorkflowCount();
  }

  /** Return the latest status snapshot for a newly authenticated socket. */
  getSnapshot(): SystemStatusSnapshot {
    const activity = [...this.providerSyncs.values()].sort((left, right) => right.sequence - left.sequence)[0];
    return {
      activity: activity
        ? {
            kind: activity.kind,
            phase: activity.phase,
            repositoriesCompleted: activity.repositoriesCompleted,
            repositoriesTotal: activity.repositoriesTotal,
            workflowRunsCompleted: activity.workflowRunsCompleted,
            workflowRunsTotal: activity.workflowRunsTotal,
          }
        : null,
      runningWorkflowCount: this.runningWorkflowCount,
      updatedAt: new Date().toISOString(),
    };
  }

  /** Start tracking one scheduled or webhook-triggered provider synchronization. */
  beginProviderSync(): string {
    const id = randomUUID();
    this.providerSyncs.set(id, {
      kind: 'PROVIDER_SYNC',
      phase: 'LOADING_REPOSITORIES',
      repositoriesCompleted: 0,
      repositoriesTotal: 0,
      sequence: ++this.sequence,
      workflowRunsCompleted: null,
      workflowRunsTotal: null,
    });
    this.publish();
    return id;
  }

  /** Replace the safe progress fields for an active provider synchronization. */
  updateProviderSync(id: string, update: ProviderSyncActivityUpdate): void {
    if (!this.providerSyncs.has(id)) return;
    this.providerSyncs.set(id, { kind: 'PROVIDER_SYNC', ...update, sequence: ++this.sequence });
    this.publish();
  }

  /** Stop exposing a completed provider synchronization. */
  finishProviderSync(id: string): void {
    if (!this.providerSyncs.delete(id)) return;
    this.publish();
  }

  /** Refresh the global number of workflow runs currently persisted as running. */
  async refreshRunningWorkflowCount(): Promise<void> {
    try {
      this.runningWorkflowCount = await this.prisma.workflowRun.count({ where: { status: 'RUNNING' } });
      this.publish();
    } catch {
      this.logger.warn('Could not refresh the running workflow count.');
    }
  }

  private publish(): void {
    this.changes.next(this.getSnapshot());
  }
}
