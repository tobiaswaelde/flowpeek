import { BadRequestException, Injectable } from '@nestjs/common';
import type { QueryOptionsMap } from '@querry-kit/nest';

import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { WorkflowRunsQueryService, type WorkflowRunTypeMap } from '../workflow-runs/workflow-runs-query.service.js';
import type { DashboardStatusDistributionDto, DashboardSummaryDto } from './dto/dashboard-summary.dto.js';
import type { DashboardWorkflowRunModel } from './dto/dashboard-workflow-run.dto.js';
import type { RepositoryHealthDto } from './dto/repository-health.dto.js';
import type {
  DashboardPeriodQueryDto,
  TrendBucketSize,
  WorkflowRunTrendQueryDto,
} from './dto/workflow-run-trend.dto.js';

const dashboardRunInclude = {
  repository: {
    select: {
      id: true,
      name: true,
      owner: true,
      providerAccount: { select: { displayName: true, id: true, providerType: true } },
      url: true,
    },
  },
} satisfies Prisma.WorkflowRunInclude;
const dashboardSummarySelect = {
  awaitingApproval: true,
  durationMs: true,
  status: true,
} satisfies Prisma.WorkflowRunSelect;
const repositoryHealthSelect = {
  durationMs: true,
  repository: { select: { id: true, name: true, owner: true, url: true } },
  status: true,
} satisfies Prisma.WorkflowRunSelect;
const completedDashboardStatuses = ['SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED', 'UNKNOWN'] as const;
const repositoryHealthLimit = 6;

type DashboardSummaryRun = Prisma.WorkflowRunGetPayload<{ select: typeof dashboardSummarySelect }>;
type RepositoryHealthRun = Prisma.WorkflowRunGetPayload<{ select: typeof repositoryHealthSelect }>;

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
   * Return each visible workflow whose newest provider run failed.
   *
   * @param user - Authenticated user requesting the dashboard.
   * @returns The latest failed run for every currently failing repository workflow.
   */
  async getLatestFailures(user: AuthenticatedUser): Promise<DashboardWorkflowRunModel[]> {
    const runs = await this.findVisibleRuns(user, {
      distinct: ['repositoryId', 'workflowName'],
      orderBy: [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
    });
    return this.selectLatestFailures(runs);
  }

  /**
   * Return every visible workflow run that currently requires provider approval.
   *
   * @param user - Authenticated user requesting the approval queue.
   * @returns Approval-gated workflow runs ordered newest first.
   */
  async getAwaitingApproval(user: AuthenticatedUser): Promise<DashboardWorkflowRunModel[]> {
    return this.findVisibleRuns(user, {
      orderBy: [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
      where: { awaitingApproval: true },
    });
  }

  /**
   * Return the ten newest workflow runs visible to the user.
   *
   * @param user - Authenticated user requesting the dashboard.
   * @returns The latest visible provider workflow runs.
   */
  async getLatestRuns(user: AuthenticatedUser): Promise<DashboardWorkflowRunModel[]> {
    return this.findVisibleRuns(user, {
      orderBy: [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
      take: 10,
    });
  }

  /**
   * Summarize visible period metrics and current workflow state.
   *
   * Success rate excludes cancelled, skipped, and unknown outcomes because those runs do not represent a decided result.
   *
   * @param user - Authenticated user requesting the dashboard.
   * @param query - Inclusive period used for completed-run metrics.
   * @returns Permission-aware summary metrics.
   */
  async getSummary(user: AuthenticatedUser, query: DashboardPeriodQueryDto): Promise<DashboardSummaryDto> {
    const { from, to } = this.parsePeriod(query);
    const ability = await this.workflowRuns.getReadAbility(user);
    const [completedRuns, activeRuns] = await Promise.all([
      this.workflowRuns.findMany<DashboardSummaryRun>(
        {
          select: dashboardSummarySelect,
          where: {
            completedAt: { gte: from.toISOString(), lte: to.toISOString() },
            status: { in: [...completedDashboardStatuses] },
          },
        },
        ability,
      ),
      this.workflowRuns.findMany<DashboardSummaryRun>(
        { select: dashboardSummarySelect, where: { status: { in: ['QUEUED', 'RUNNING'] } } },
        ability,
      ),
    ]);
    const statuses = this.countStatuses(completedRuns);
    const decidedCount = statuses.success + statuses.failed;

    return {
      awaitingApprovalCount: activeRuns.filter((run) => run.awaitingApproval).length,
      completedCount: completedRuns.length,
      medianDurationMs: this.median(completedRuns.flatMap((run) => (run.durationMs === null ? [] : [run.durationMs]))),
      queuedCount: activeRuns.filter((run) => run.status === 'QUEUED').length,
      runningCount: activeRuns.filter((run) => run.status === 'RUNNING').length,
      statuses,
      successRate: decidedCount === 0 ? 0 : this.roundPercentage((statuses.success / decidedCount) * 100),
    };
  }

  /**
   * Aggregate and rank visible repository workflow health for one period.
   *
   * @param user - Authenticated user requesting the dashboard.
   * @param query - Inclusive period used for completed-run metrics.
   * @returns Up to six visible repositories ordered by failures and success rate.
   */
  async getRepositoryHealth(user: AuthenticatedUser, query: DashboardPeriodQueryDto): Promise<RepositoryHealthDto[]> {
    const { from, to } = this.parsePeriod(query);
    const ability = await this.workflowRuns.getReadAbility(user);
    const runs = await this.workflowRuns.findMany<RepositoryHealthRun>(
      {
        select: repositoryHealthSelect,
        where: {
          completedAt: { gte: from.toISOString(), lte: to.toISOString() },
          status: { in: [...completedDashboardStatuses] },
        },
      },
      ability,
    );
    const groups = new Map<string, RepositoryHealthRun[]>();
    for (const run of runs) {
      const group = groups.get(run.repository.id) ?? [];
      group.push(run);
      groups.set(run.repository.id, group);
    }

    return [...groups.values()]
      .map((repositoryRuns): RepositoryHealthDto => {
        const statuses = this.countStatuses(repositoryRuns);
        const decidedCount = statuses.success + statuses.failed;
        return {
          completedCount: repositoryRuns.length,
          failedCount: statuses.failed,
          medianDurationMs: this.median(
            repositoryRuns.flatMap((run) => (run.durationMs === null ? [] : [run.durationMs])),
          ),
          repository: repositoryRuns[0]!.repository,
          successRate: decidedCount === 0 ? 0 : this.roundPercentage((statuses.success / decidedCount) * 100),
        };
      })
      .sort(
        (left, right) =>
          right.failedCount - left.failedCount ||
          left.successRate - right.successRate ||
          right.completedCount - left.completedCount ||
          `${left.repository.owner}/${left.repository.name}`.localeCompare(
            `${right.repository.owner}/${right.repository.name}`,
          ),
      )
      .slice(0, repositoryHealthLimit);
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
    const { from, to } = this.parsePeriod(query);

    const runs = await this.findVisibleRuns(user, {
      where: {
        completedAt: { gte: from.toISOString(), lte: to.toISOString() },
        status: { in: ['SUCCESS', 'FAILED'] },
      },
    });
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

  private async findVisibleRuns(
    user: AuthenticatedUser,
    options: QueryOptionsMap<WorkflowRunTypeMap>['findMany'],
  ): Promise<DashboardWorkflowRunModel[]> {
    const ability = await this.workflowRuns.getReadAbility(user);
    return this.workflowRuns.findMany<DashboardWorkflowRunModel>({ ...options, include: dashboardRunInclude }, ability);
  }

  private countStatuses(runs: Pick<DashboardSummaryRun, 'status'>[]): DashboardStatusDistributionDto {
    return {
      cancelled: runs.filter((run) => run.status === 'CANCELLED').length,
      failed: runs.filter((run) => run.status === 'FAILED').length,
      skipped: runs.filter((run) => run.status === 'SKIPPED').length,
      success: runs.filter((run) => run.status === 'SUCCESS').length,
      unknown: runs.filter((run) => run.status === 'UNKNOWN').length,
    };
  }

  private median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle];
  }

  private parsePeriod(query: DashboardPeriodQueryDto): { from: Date; to: Date } {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException('The dashboard start timestamp must not be after the end timestamp.');
    }
    return { from, to };
  }

  private roundPercentage(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private selectLatestFailures(runs: DashboardWorkflowRunModel[]): DashboardWorkflowRunModel[] {
    const latestByWorkflow = new Map<string, DashboardWorkflowRunModel>();
    for (const run of runs) {
      const key = `${run.repositoryId}\u0000${run.workflowName}`;
      if (!latestByWorkflow.has(key)) latestByWorkflow.set(key, run);
    }
    return [...latestByWorkflow.values()].filter((run) => run.status === 'FAILED');
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
