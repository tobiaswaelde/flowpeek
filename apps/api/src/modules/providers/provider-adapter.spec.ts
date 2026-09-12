import { buildWorkflowRunScopeKey, type ProviderAdapter } from './provider-adapter.js';

describe('ProviderAdapter contract', () => {
  it('supports only read-only provider operations', async () => {
    const adapter: ProviderAdapter = {
      providerType: 'GITHUB',
      getChangeRequestState: jest.fn().mockResolvedValue(null),
      getRepository: jest.fn().mockResolvedValue(null),
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

  it('uses change requests before branches when identifying an execution context', () => {
    expect(buildWorkflowRunScopeKey('42', 'feature/workflows')).toBe('change-request:42');
    expect(buildWorkflowRunScopeKey(null, 'main')).toBe('branch:main');
    expect(buildWorkflowRunScopeKey(null, null)).toBe('repository');
  });
});
