import { RepositoryRefreshController } from './repository-refresh.controller.js';

describe('RepositoryRefreshController', () => {
  it('returns refreshed repository metadata from the administrator service', async () => {
    const repository = {
      enabled: true,
      id: 'repository-id',
      lastSyncAt: null,
      name: 'renamed',
      owner: 'new-owner',
      providerAccountId: 'provider-id',
      providerRepositoryId: '42',
      url: 'https://example.test/new-owner/renamed',
      workflowRunRetentionDays: null,
    };
    const metadata = { refreshById: jest.fn().mockResolvedValue(repository) };
    const controller = new RepositoryRefreshController(metadata as never);
    const user = { id: 'admin', role: 'SYSTEM_ADMIN' as const, username: 'admin' };

    await expect(controller.refresh({ user }, repository.id)).resolves.toMatchObject({
      id: repository.id,
      name: 'renamed',
      owner: 'new-owner',
    });
    expect(metadata.refreshById).toHaveBeenCalledWith(user, repository.id);
  });
});
