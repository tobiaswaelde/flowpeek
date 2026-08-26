import type { ProviderAdapter } from './provider-adapter.js';

describe('ProviderAdapter contract', () => {
  it('supports only read-only provider operations', async () => {
    const adapter: ProviderAdapter = {
      providerType: 'GITHUB',
      getWorkflowRun: jest.fn().mockResolvedValue(null),
      listRepositories: jest.fn().mockResolvedValue([]),
      listWorkflowRuns: jest.fn().mockResolvedValue([]),
      validateAccount: jest.fn().mockResolvedValue({ displayName: 'GitHub', valid: true }),
      verifyWebhook: jest.fn().mockResolvedValue(null),
    };

    await expect(
      adapter.listRepositories({ accessToken: 'token', baseUrl: null, providerAccountId: 'account' }),
    ).resolves.toEqual([]);
    expect('createWorkflowRun' in adapter).toBe(false);
    expect('startWorkflow' in adapter).toBe(false);
  });
});
