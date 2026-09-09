import { UserPreferencesController } from './user-preferences.controller.js';
import type { UserPreferencesService } from './user-preferences.service.js';

describe('UserPreferencesController', () => {
  const persisted = { dismissedIntroBannerIds: ['dashboard'] };
  const preferences = {
    dismissIntroBanner: jest.fn().mockResolvedValue(persisted),
    get: jest.fn().mockResolvedValue(persisted),
    restoreIntroBanners: jest.fn().mockResolvedValue({ dismissedIntroBannerIds: [] }),
  };
  const controller = new UserPreferencesController(preferences as unknown as UserPreferencesService);

  beforeEach(() => jest.clearAllMocks());

  it('reads preferences for the authenticated user only', async () => {
    await expect(controller.get({ user: { id: 'viewer', role: 'VIEWER', username: 'viewer' } })).resolves.toBe(
      persisted,
    );
    expect(preferences.get).toHaveBeenCalledWith('viewer');
  });

  it('dismisses a banner for the authenticated user only', async () => {
    await expect(
      controller.dismissIntroBanner(
        { user: { id: 'manager', role: 'MANAGER', username: 'manager' } },
        { bannerId: 'workflow-runs' },
      ),
    ).resolves.toBe(persisted);
    expect(preferences.dismissIntroBanner).toHaveBeenCalledWith('manager', 'workflow-runs');
  });

  it('restores banners for the authenticated user only', async () => {
    await expect(
      controller.restoreIntroBanners({ user: { id: 'admin', role: 'SYSTEM_ADMIN', username: 'admin' } }),
    ).resolves.toEqual({ dismissedIntroBannerIds: [] });
    expect(preferences.restoreIntroBanners).toHaveBeenCalledWith('admin');
  });
});
