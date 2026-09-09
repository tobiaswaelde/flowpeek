import type { PrismaService } from '../../prisma/prisma.service.js';
import type { RepositoryQueryDto } from './dto/repository-query.dto.js';
import type { RepositoryResourceModel } from './dto/resource.dto.js';
import type { RepositoriesQueryService } from './repositories-query.service.js';
import { RepositoriesController } from './repositories.controller.js';
import type { RepositoryConfigurationService } from './repository-configuration.service.js';

describe('RepositoriesController', () => {
  it('loads and projects the workflow-run count required by the administration table', async () => {
    const repository = {
      _count: { workflowRuns: 12 },
      createdAt: new Date('2026-09-09T08:00:00.000Z'),
      enabled: true,
      id: 'repository-1',
      lastSyncAt: null,
      name: 'flowpeek',
      owner: 'twaelde',
      providerAccountId: 'provider-1',
      providerRepositoryId: '42',
      updatedAt: new Date('2026-09-09T08:00:00.000Z'),
      url: 'https://github.com/tobiaswaelde/flowpeek',
      workflowRunRetentionDays: 30,
    } satisfies RepositoryResourceModel;
    const query = {
      fields: 'id,name,workflowRunCount',
      page: 1,
      perPage: 10,
    } as RepositoryQueryDto;
    const repositories = {
      getReadAbility: jest.fn().mockReturnValue(undefined),
      query: jest.fn().mockResolvedValue({
        items: [repository],
        pageMeta: { hasNextPage: false, hasPrevPage: false, itemCount: 1, page: 1, pageCount: 1, perPage: 10 },
      }),
      toQueryOptions: jest.fn().mockReturnValue(query),
    };
    const controller = new RepositoriesController(
      {} as PrismaService,
      {} as RepositoryConfigurationService,
      repositories as unknown as RepositoriesQueryService,
    );

    const response = await controller.query({ user: { id: 'admin', role: 'SYSTEM_ADMIN', username: 'admin' } }, query);

    expect(repositories.query).toHaveBeenCalledWith(
      expect.objectContaining({ include: { _count: { select: { workflowRuns: true } } } }),
      undefined,
    );
    expect(response.items).toEqual([{ id: 'repository-1', name: 'flowpeek', workflowRunCount: 12 }]);
  });
});
