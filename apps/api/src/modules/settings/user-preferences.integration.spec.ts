import { PrismaService } from '../../prisma/prisma.service.js';
import { TestDatabaseService } from '../../prisma/test-database.service.js';
import { UserPreferencesService } from './user-preferences.service.js';

/** Verify user preference isolation and idempotency through real PostgreSQL queries. */
describe('user preference integration', () => {
  const prisma = new PrismaService();
  const database = new TestDatabaseService(prisma);
  const preferences = new UserPreferencesService(prisma);

  beforeAll(async () => prisma.onModuleInit());
  beforeEach(async () => database.cleanup());
  afterAll(async () => prisma.onModuleDestroy());

  it('isolates banner preferences by user and ignores repeated dismissals', async () => {
    const [viewer, manager] = await Promise.all([
      prisma.user.create({ data: { passwordHash: 'hash', role: 'VIEWER', username: 'viewer' } }),
      prisma.user.create({ data: { passwordHash: 'hash', role: 'MANAGER', username: 'manager' } }),
    ]);

    await preferences.dismissIntroBanner(viewer.id, 'dashboard');
    await preferences.dismissIntroBanner(viewer.id, 'dashboard');

    await expect(preferences.get(viewer.id)).resolves.toEqual({ dismissedIntroBannerIds: ['dashboard'] });
    await expect(preferences.get(manager.id)).resolves.toEqual({ dismissedIntroBannerIds: [] });
  });

  it('restores only banner preferences and preserves unrelated user fields', async () => {
    const viewer = await prisma.user.create({
      data: {
        dismissedIntroBannerIds: ['dashboard', 'notifications'],
        passwordHash: 'hash',
        role: 'VIEWER',
        username: 'viewer',
      },
    });

    await expect(preferences.restoreIntroBanners(viewer.id)).resolves.toEqual({ dismissedIntroBannerIds: [] });
    await expect(prisma.user.findUniqueOrThrow({ where: { id: viewer.id } })).resolves.toMatchObject({
      dismissedIntroBannerIds: [],
      passwordHash: 'hash',
      role: 'VIEWER',
      username: 'viewer',
    });
  });
});
