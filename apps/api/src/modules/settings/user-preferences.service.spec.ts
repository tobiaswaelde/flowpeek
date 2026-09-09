import type { PrismaService } from '../../prisma/prisma.service.js';
import { UserPreferencesService } from './user-preferences.service.js';

describe('UserPreferencesService', () => {
  const user = {
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const service = new UserPreferencesService({ user } as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('returns only the current user interface preferences', async () => {
    user.findUniqueOrThrow.mockResolvedValue({ dismissedIntroBannerIds: ['dashboard'] });

    await expect(service.get('viewer')).resolves.toEqual({ dismissedIntroBannerIds: ['dashboard'] });
    expect(user.findUniqueOrThrow).toHaveBeenCalledWith({
      select: { dismissedIntroBannerIds: true },
      where: { id: 'viewer' },
    });
  });

  it('idempotently dismisses a banner only for the current user', async () => {
    user.updateMany.mockResolvedValue({ count: 1 });
    user.findUniqueOrThrow.mockResolvedValue({ dismissedIntroBannerIds: ['dashboard'] });

    await expect(service.dismissIntroBanner('viewer', 'dashboard')).resolves.toEqual({
      dismissedIntroBannerIds: ['dashboard'],
    });
    expect(user.updateMany).toHaveBeenCalledWith({
      data: { dismissedIntroBannerIds: { push: 'dashboard' } },
      where: { id: 'viewer', NOT: { dismissedIntroBannerIds: { has: 'dashboard' } } },
    });
  });

  it('returns the unchanged preferences when the banner was already dismissed', async () => {
    user.updateMany.mockResolvedValue({ count: 0 });
    user.findUniqueOrThrow.mockResolvedValue({ dismissedIntroBannerIds: ['dashboard'] });

    await expect(service.dismissIntroBanner('viewer', 'dashboard')).resolves.toEqual({
      dismissedIntroBannerIds: ['dashboard'],
    });
    expect(user.updateMany).toHaveBeenCalledTimes(1);
  });

  it('restores banners without changing unrelated user fields', async () => {
    user.update.mockResolvedValue({ dismissedIntroBannerIds: [] });

    await expect(service.restoreIntroBanners('manager')).resolves.toEqual({ dismissedIntroBannerIds: [] });
    expect(user.update).toHaveBeenCalledWith({
      data: { dismissedIntroBannerIds: { set: [] } },
      select: { dismissedIntroBannerIds: true },
      where: { id: 'manager' },
    });
  });
});
