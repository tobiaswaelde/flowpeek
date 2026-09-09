import type { WorkflowRunResourceModel } from '../repositories/dto/resource.dto.js';
import type { WorkflowRunQueryDto } from './dto/workflow-run-query.dto.js';
import type { WorkflowRunsQueryService } from './workflow-runs-query.service.js';
import { WorkflowRunsController } from './workflow-runs.controller.js';

describe('WorkflowRunsController', () => {
  it('loads and projects the repository and provider context required by the history table', async () => {
    const workflowRun = {
      awaitingApproval: false,
      completedAt: new Date('2026-09-08T08:02:30.000Z'),
      createdAt: new Date('2026-09-08T08:00:00.000Z'),
      displayTitle: 'Build on main',
      durationMs: 150_000,
      event: 'push',
      headBranch: 'main',
      headSha: '0123456789abcdef',
      id: 'run-1',
      providerCreatedAt: new Date('2026-09-08T08:00:00.000Z'),
      providerRunId: '42',
      rawStatus: 'completed',
      reviewUrl: null,
      repository: {
        name: 'flowpeek',
        owner: 'twaelde',
        providerAccount: { providerType: 'GITHUB' },
      },
      repositoryId: 'repository-1',
      scopeKey: 'branch:main',
      startedAt: new Date('2026-09-08T08:00:00.000Z'),
      status: 'SUCCESS',
      updatedAt: new Date('2026-09-08T08:02:30.000Z'),
      url: 'https://github.com/tobiaswaelde/flowpeek/actions/runs/42',
      changeRequestNumber: null,
      workflowId: 'workflow-1',
      workflowName: 'Build',
    } satisfies WorkflowRunResourceModel;
    const query = {
      fields:
        'id,url,workflowName,displayTitle,status,durationMs,completedAt,repositoryName,repositoryOwner,providerType',
      page: 1,
      perPage: 25,
    } as WorkflowRunQueryDto;
    const workflowRuns = {
      getReadAbility: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({
        items: [workflowRun],
        pageMeta: { hasNextPage: false, hasPrevPage: false, itemCount: 1, page: 1, pageCount: 1, perPage: 25 },
      }),
      toQueryOptions: jest.fn().mockReturnValue(query),
    };
    const controller = new WorkflowRunsController(workflowRuns as unknown as WorkflowRunsQueryService);

    const response = await controller.query({ user: { id: 'admin', role: 'SYSTEM_ADMIN', username: 'admin' } }, query);

    expect(workflowRuns.query).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          repository: {
            select: {
              name: true,
              owner: true,
              providerAccount: { select: { providerType: true } },
            },
          },
        },
      }),
      undefined,
    );
    expect(response.items).toEqual([
      {
        completedAt: workflowRun.completedAt,
        displayTitle: 'Build on main',
        durationMs: 150_000,
        id: 'run-1',
        providerType: 'GITHUB',
        repositoryName: 'flowpeek',
        repositoryOwner: 'twaelde',
        status: 'SUCCESS',
        url: workflowRun.url,
        workflowName: 'Build',
      },
    ]);
  });
});
