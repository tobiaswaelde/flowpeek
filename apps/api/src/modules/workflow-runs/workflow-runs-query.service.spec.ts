import { CaslAbilityFactory } from '../../casl/casl-ability.factory.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { WorkflowRunsQueryService } from './workflow-runs-query.service.js';

describe('WorkflowRunsQueryService', () => {
  it('combines a workflow-name search with repository-scoped CASL access', async () => {
    const mocks = {
      repositoryMembership: {
        findMany: jest.fn().mockResolvedValue([{ repositoryId: 'repository-a', role: 'VIEWER' }]),
      },
      workflowRun: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new WorkflowRunsQueryService(mocks as unknown as PrismaService, new CaslAbilityFactory());
    const ability = await service.getReadAbility({ id: 'viewer', role: 'VIEWER', username: 'viewer' });

    await service.query(
      service.toQueryOptions({ page: 1, perPage: 20, search: 'deploy', where: { status: 'FAILED' } }),
      ability,
    );

    expect(mocks.repositoryMembership.findMany).toHaveBeenCalledWith({
      select: { repositoryId: true, role: true },
      where: { userId: 'viewer' },
    });
    expect(mocks.workflowRun.count).toHaveBeenCalledWith({
      where: {
        AND: [
          { OR: [{ repositoryId: { in: ['repository-a'] } }] },
          {
            AND: [
              { status: 'FAILED' },
              {
                OR: [
                  { displayTitle: { contains: 'deploy', mode: 'insensitive' } },
                  { providerRunId: { contains: 'deploy', mode: 'insensitive' } },
                  { repository: { name: { contains: 'deploy', mode: 'insensitive' } } },
                  { repository: { owner: { contains: 'deploy', mode: 'insensitive' } } },
                  { workflowName: { contains: 'deploy', mode: 'insensitive' } },
                ],
              },
            ],
          },
        ],
      },
    });
    expect(mocks.workflowRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 20,
      }),
    );
  });

  it('uses the requested Query Kit sort order instead of the default', () => {
    const service = new WorkflowRunsQueryService({ workflowRun: {} } as PrismaService, new CaslAbilityFactory());

    expect(service.toQueryOptions({ orderBy: { completedAt: 'asc' }, page: 1, perPage: 10 })).toMatchObject({
      orderBy: { completedAt: 'asc' },
    });
  });

  it('centralizes latest-terminal failure selection before applying public Query Kit filters', async () => {
    const mocks = {
      workflowRun: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'failed-run', status: 'FAILED' },
          { id: 'successful-run', status: 'SUCCESS' },
        ]),
      },
    };
    const service = new WorkflowRunsQueryService(mocks as unknown as PrismaService, new CaslAbilityFactory());
    const ability = new CaslAbilityFactory().createForUser(
      { id: 'admin', role: 'SYSTEM_ADMIN', username: 'admin' },
      [],
    );

    await expect(
      service.toNeedsAttentionQueryOptions(
        { page: 2, perPage: 10, search: 'deploy', where: { repositoryId: 'repository-a' } },
        ability,
      ),
    ).resolves.toMatchObject({
      orderBy: [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
      page: 2,
      perPage: 10,
      where: {
        AND: [
          { id: { in: ['failed-run'] } },
          {
            AND: [
              { repositoryId: 'repository-a' },
              {
                OR: [
                  { displayTitle: { contains: 'deploy', mode: 'insensitive' } },
                  { providerRunId: { contains: 'deploy', mode: 'insensitive' } },
                  { repository: { name: { contains: 'deploy', mode: 'insensitive' } } },
                  { repository: { owner: { contains: 'deploy', mode: 'insensitive' } } },
                  { workflowName: { contains: 'deploy', mode: 'insensitive' } },
                ],
              },
            ],
          },
        ],
      },
    });
    expect(mocks.workflowRun.findMany).toHaveBeenCalledWith({
      cursor: undefined,
      distinct: ['workflowId', 'scopeKey'],
      include: undefined,
      orderBy: [{ providerCreatedAt: 'desc' }, { id: 'desc' }],
      select: { id: true, status: true },
      skip: undefined,
      take: undefined,
      where: {
        AND: [
          {},
          {
            awaitingApproval: false,
            completedAt: { not: null },
            status: { in: ['SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED', 'UNKNOWN'] },
            workflow: { kind: 'STANDARD' },
          },
        ],
      },
    });
  });
});
