import { BadRequestException, Injectable } from '@nestjs/common';

import type { WorkflowRun } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { WorkflowRunsQueryService } from '../workflow-runs/workflow-runs-query.service.js';
import type { TrendBucketSize, WorkflowRunTrendQueryDto } from './dto/workflow-run-trend.dto.js';

const terminalStatuses = ['SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED'] as const;

/** Success and error counts for a UTC workflow-run trend interval. */
export interface WorkflowRunTrendBucket {
  bucketStart: Date;
  errorCount: number;
  successCount: number;
}

/** Reads dashboard aggregates from only the workflow runs visible to the authenticated user. */
@Injectable()
export class DashboardService {
  constructor(private readonly workflowRuns: WorkflowRunsQueryService) {}

  /**
   * Return each visible workflow whose newest terminal run failed.
   *
   * @param user - Authenticated user requesting the dashboard.
   * @returns The latest failed run for every currently failing repository workflow.
   */
  async getLatestFailures(user: AuthenticatedUser): Promise<WorkflowRun[]> {
    const ability = await this.workflowRuns.getReadAbility(user);
    const terminalRuns = await this.workflowRuns.findMany<WorkflowRun>(
      {
        orderBy: [{ completedAt: 'desc' }, { providerCreatedAt: 'desc' }, { id: 'desc' }],
        where: {
          completedAt: { not: null },
          status: { in: [...terminalStatuses] },
        },
      },
      ability,
    );
    const latestByWorkflow = new Map<string, WorkflowRun>();
    for (const run of terminalRuns) {
      const key = `${run.repositoryId}\u0000${run.workflowName}`;
      if (!latestByWorkflow.has(key)) latestByWorkflow.set(key, run);
    }

    return [...latestByWorkflow.values()].filter((run) => run.status === 'FAILED');
  }

  /**
   * Return the ten newest workflow runs visible to the user.
   *
   * @param user - Authenticated user requesting the dashboard.
   * @returns The latest visible provider workflow runs.
   */
  async getLatestRuns(user: AuthenticatedUser): Promise<WorkflowRun[]> {
    const ability = await this.workflowRuns.getReadAbility(user);
    return this.workflowRuns.findMany<WorkflowRun>(
      {
        orderBy: [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
        take: 10,
      },
      ability,
    );
  }

  /**
   * Aggregate visible completed runs into UTC success and error trend buckets.
   *
   * @param user - Authenticated user requesting the dashboard.
   * @param query - Inclusive time range and bucket size.
   * @returns A continuous sequence of trend buckets, including empty intervals.
   * @throws {BadRequestException} When the requested range is invalid.
   */
  async getTrend(user: AuthenticatedUser, query: WorkflowRunTrendQueryDto): Promise<WorkflowRunTrendBucket[]> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException('The trend start timestamp must not be after the end timestamp.');
    }

    const ability = await this.workflowRuns.getReadAbility(user);
    const runs = await this.workflowRuns.findMany<WorkflowRun>(
      {
        where: {
          completedAt: { gte: from, lte: to },
          status: { in: ['SUCCESS', 'FAILED'] },
        },
      },
      ability,
    );
    const buckets = this.createBuckets(from, to, query.bucket);
    const counts = new Map(buckets.map((bucket) => [bucket.bucketStart.toISOString(), bucket]));

    for (const run of runs) {
      if (!run.completedAt) continue;
      const bucket = counts.get(this.floorBucket(run.completedAt, query.bucket).toISOString());
      if (!bucket) continue;
      if (run.status === 'SUCCESS') bucket.successCount += 1;
      if (run.status === 'FAILED') bucket.errorCount += 1;
    }

    return buckets;
  }

  private createBuckets(from: Date, to: Date, size: TrendBucketSize): WorkflowRunTrendBucket[] {
    const buckets: WorkflowRunTrendBucket[] = [];
    for (
      let bucketStart = this.floorBucket(from, size);
      bucketStart <= to;
      bucketStart = this.nextBucket(bucketStart, size)
    ) {
      buckets.push({ bucketStart, errorCount: 0, successCount: 0 });
    }
    return buckets;
  }

  private floorBucket(value: Date, size: TrendBucketSize): Date {
    const date = new Date(value);
    date.setUTCMinutes(0, 0, 0);
    if (size === 'hour') return date;

    date.setUTCHours(0);
    if (size === 'day') return date;

    const day = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
    return date;
  }

  private nextBucket(value: Date, size: TrendBucketSize): Date {
    const next = new Date(value);
    if (size === 'hour') next.setUTCHours(next.getUTCHours() + 1);
    if (size === 'day') next.setUTCDate(next.getUTCDate() + 1);
    if (size === 'week') next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }
}
