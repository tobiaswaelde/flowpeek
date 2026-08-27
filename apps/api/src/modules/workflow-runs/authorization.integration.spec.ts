import { CaslAbilityFactory } from '../../casl/casl-ability.factory.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TestDatabaseService } from '../../prisma/test-database.service.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import { WorkflowRunsQueryService } from './workflow-runs-query.service.js';

/** Verify persisted CASL restrictions through real PostgreSQL queries and dashboard aggregates. */
describe('workflow-run authorization integration', () => {
  const prisma = new PrismaService();
  const database = new TestDatabaseService(prisma);
  const runs = new WorkflowRunsQueryService(prisma, new CaslAbilityFactory());
  const dashboard = new DashboardService(runs);

  let users: Record<'admin' | 'manager' | 'viewer' | 'outsider', AuthenticatedUser>;
  let visibleRunId: string;
  let hiddenRunId: string;

  beforeAll(async () => prisma.onModuleInit());
  beforeEach(async () => {
    await database.cleanup();

    const account = await prisma.providerAccount.create({
      data: {
        displayName: 'Integration provider',
        encryptedAccessToken: 'encrypted-token',
        providerType: 'GITHUB',
      },
    });
    const [visibleRepository, hiddenRepository] = await Promise.all([
      prisma.repository.create({
        data: {
          name: 'visible',
          owner: 'flowpeek',
          providerAccountId: account.id,
          providerRepositoryId: 'visible',
          url: 'https://github.com/flowpeek/visible',
        },
      }),
      prisma.repository.create({
        data: {
          name: 'hidden',
          owner: 'flowpeek',
          providerAccountId: account.id,
          providerRepositoryId: 'hidden',
          url: 'https://github.com/flowpeek/hidden',
        },
      }),
    ]);
    const [admin, manager, viewer, outsider] = await Promise.all([
      prisma.user.create({ data: { passwordHash: 'hash', role: 'SYSTEM_ADMIN', username: 'admin' } }),
      prisma.user.create({ data: { passwordHash: 'hash', role: 'MANAGER', username: 'manager' } }),
      prisma.user.create({ data: { passwordHash: 'hash', role: 'VIEWER', username: 'viewer' } }),
      prisma.user.create({ data: { passwordHash: 'hash', role: 'VIEWER', username: 'outsider' } }),
    ]);
    await Promise.all([
      prisma.repositoryMembership.create({
        data: { repositoryId: visibleRepository.id, role: 'MANAGER', userId: manager.id },
      }),
      prisma.repositoryMembership.create({
        data: { repositoryId: visibleRepository.id, role: 'VIEWER', userId: viewer.id },
      }),
    ]);
    const createdAt = new Date('2026-08-26T10:00:00.000Z');
    const [visibleRun, hiddenRun] = await Promise.all([
      prisma.workflowRun.create({
        data: {
          completedAt: createdAt,
          providerCreatedAt: createdAt,
          providerRunId: 'visible-run',
          rawStatus: 'failure',
          repositoryId: visibleRepository.id,
          status: 'FAILED',
          url: 'https://github.com/flowpeek/visible/actions/runs/1',
          workflowName: 'Visible workflow',
        },
      }),
      prisma.workflowRun.create({
        data: {
          completedAt: createdAt,
          providerCreatedAt: createdAt,
          providerRunId: 'hidden-run',
          rawStatus: 'success',
          repositoryId: hiddenRepository.id,
          status: 'SUCCESS',
          url: 'https://github.com/flowpeek/hidden/actions/runs/1',
          workflowName: 'Hidden workflow',
        },
      }),
    ]);
    users = {
      admin: { id: admin.id, role: admin.role, username: admin.username },
      manager: { id: manager.id, role: manager.role, username: manager.username },
      outsider: { id: outsider.id, role: outsider.role, username: outsider.username },
      viewer: { id: viewer.id, role: viewer.role, username: viewer.username },
    };
    hiddenRunId = hiddenRun.id;
    visibleRunId = visibleRun.id;
  });
  afterAll(async () => prisma.onModuleDestroy());

  it.each([
    ['admin', [expect.any(String), expect.any(String)], 1, 1],
    ['manager', [expect.any(String)], 1, 0],
    ['viewer', [expect.any(String)], 1, 0],
    ['outsider', [], 0, 0],
  ] as const)(
    '%s sees only permitted runs in lists, failures, and trend charts',
    async (role, expectedRunIds, failures, successes) => {
      const user = users[role];
      const ability = await runs.getReadAbility(user);
      const visible = await runs.findMany<{ id: string }>({ orderBy: { id: 'asc' } }, ability);

      expect(visible.map((run) => run.id)).toEqual(expectedRunIds);
      if (role === 'admin')
        expect(visible.map((run) => run.id)).toEqual(expect.arrayContaining([visibleRunId, hiddenRunId]));
      if (role !== 'admin') expect(visible.map((run) => run.id)).not.toContain(hiddenRunId);

      await expect(dashboard.getLatestFailures(user)).resolves.toHaveLength(failures);
      await expect(
        dashboard.getTrend(user, {
          bucket: 'day',
          from: '2026-08-26T00:00:00.000Z',
          to: '2026-08-26T23:59:59.999Z',
        }),
      ).resolves.toEqual([
        { bucketStart: new Date('2026-08-26T00:00:00.000Z'), errorCount: failures, successCount: successes },
      ]);
    },
  );
});
