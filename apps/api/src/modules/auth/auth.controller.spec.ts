import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  it('updates only the currently authenticated user profile', async () => {
    const updated = {
      avatarUpdatedAt: null,
      firstName: 'Vera',
      id: 'user-id',
      lastName: 'Viewer',
      role: 'VIEWER' as const,
      username: 'renamed',
    };
    const auth = { updateProfile: jest.fn().mockResolvedValue(updated) };
    const controller = new AuthController(auth as never, {} as never);
    const input = {
      currentPassword: 'current-password',
      firstName: 'Vera',
      lastName: 'Viewer',
      username: 'renamed',
    };

    await expect(
      controller.updateProfile({ user: { id: 'user-id', role: 'VIEWER', username: 'viewer' } }, input),
    ).resolves.toEqual(updated);
    expect(auth.updateProfile).toHaveBeenCalledWith('user-id', input);
  });
});
