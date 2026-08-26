import { Injectable } from '@nestjs/common';

import type { WorkflowRun } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { WorkflowRunsQueryService } from '../workflow-runs/workflow-runs-query.service.js';

const terminalStatuses = ['SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED'] as const;

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
}
