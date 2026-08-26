import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service.js';
import { JobRunnerService } from './job-runner.service.js';

export const DEFAULT_WORKFLOW_RUN_RETENTION_DAYS = 90;

/** Calculate the retention cutoff for a global policy or repository override. */
export function getWorkflowRunRetentionCutoff(retentionDays: number, now: Date): Date {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new RangeError('Workflow run retention must be a positive whole number of days.');
  }

  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

/** Deletes completed workflow runs once their effective retention period expires. */
@Injectable()
export class WorkflowRunRetentionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobRunnerService,
  ) {}

  /** Run the cleanup each night when background scheduling is enabled. */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduleCleanup(): Promise<void> {
    await this.jobs.run('workflow-run-retention', () => this.deleteExpiredRuns());
  }

  /** Delete only completed runs that exceed their global or repository policy. */
  async deleteExpiredRuns(now = new Date()): Promise<void> {
    const settings = await this.prisma.applicationSettings.findUnique({ where: { key: 'global' } });
    const defaultRetentionDays = settings?.workflowRunRetentionDays ?? DEFAULT_WORKFLOW_RUN_RETENTION_DAYS;
    const defaultCutoff = getWorkflowRunRetentionCutoff(defaultRetentionDays, now);

    await this.prisma.workflowRun.deleteMany({
      where: {
        completedAt: { lt: defaultCutoff },
        repository: { workflowRunRetentionDays: null },
      },
    });

    const repositories = await this.prisma.repository.findMany({
      where: { workflowRunRetentionDays: { not: null } },
      select: { id: true, workflowRunRetentionDays: true },
    });

    for (const repository of repositories) {
      const retentionDays = repository.workflowRunRetentionDays;
      if (retentionDays === null) continue;

      await this.prisma.workflowRun.deleteMany({
        where: {
          completedAt: { lt: getWorkflowRunRetentionCutoff(retentionDays, now) },
          repositoryId: repository.id,
        },
      });
    }
  }
}
