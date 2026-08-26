import type { WorkflowRun } from '../../generated/prisma/client.js';
import type { WorkflowRunsQueryService } from '../workflow-runs/workflow-runs-query.service.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
  it('returns failures only when they are the latest terminal run for a visible workflow', async () => {
    const ability = {};
    const workflowRuns = {
      findMany: jest.fn().mockResolvedValue([
        run({
          completedAt: '2026-08-26T11:00:00.000Z',
          repositoryId: 'repository-a',
          status: 'FAILED',
          workflowName: 'Test',
        }),
        run({
          completedAt: '2026-08-26T10:00:00.000Z',
          repositoryId: 'repository-a',
          status: 'SUCCESS',
          workflowName: 'Build',
        }),
        run({
          completedAt: '2026-08-26T09:00:00.000Z',
          repositoryId: 'repository-a',
          status: 'FAILED',
          workflowName: 'Build',
        }),
        run({
          completedAt: '2026-08-26T08:00:00.000Z',
          repositoryId: 'repository-b',
          status: 'CANCELLED',
          workflowName: 'Deploy',
        }),
      ]),
      getReadAbility: jest.fn().mockResolvedValue(ability),
    } as unknown as WorkflowRunsQueryService;
    const service = new DashboardService(workflowRuns);

    await expect(service.getLatestFailures({ id: 'viewer', role: 'VIEWER', username: 'viewer' })).resolves.toEqual([
      expect.objectContaining({ repositoryId: 'repository-a', status: 'FAILED', workflowName: 'Test' }),
    ]);
    expect(workflowRuns.findMany).toHaveBeenCalledWith(
      {
        orderBy: [{ completedAt: 'desc' }, { providerCreatedAt: 'desc' }, { id: 'desc' }],
        where: {
          completedAt: { not: null },
          status: { in: ['SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED'] },
        },
      },
      ability,
    );
  });
});

function run(input: {
  completedAt: string;
  repositoryId: string;
  status: WorkflowRun['status'];
  workflowName: string;
}): WorkflowRun {
  return {
    completedAt: new Date(input.completedAt),
    createdAt: new Date(input.completedAt),
    durationMs: 60_000,
    id: `${input.repositoryId}-${input.workflowName}-${input.completedAt}`,
    providerCreatedAt: new Date(input.completedAt),
    providerRunId: input.completedAt,
    rawStatus: input.status.toLowerCase(),
    repositoryId: input.repositoryId,
    startedAt: new Date(input.completedAt),
    status: input.status,
    updatedAt: new Date(input.completedAt),
    url: 'https://example.test/run',
    workflowName: input.workflowName,
  };
}
