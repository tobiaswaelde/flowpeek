import { ForgejoActionsAdapter, ForgejoActionsUnsupportedError } from './forgejo-actions.adapter.js';

describe('ForgejoActionsAdapter', () => {
  const context = { accessToken: 'token', baseUrl: 'https://forgejo.example.test', providerAccountId: 'account' };
  it('maps Actions workflow runs through the read-only API', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          workflow_runs: [
            {
              id: 7,
              workflow_name: 'CI',
              html_url: 'https://forgejo.example.test/org/repo/actions/runs/7',
              created_at: '2026-08-01T10:00:00Z',
              run_started_at: '2026-08-01T10:01:00Z',
              updated_at: '2026-08-01T10:03:00Z',
              status: 'completed',
              conclusion: 'success',
            },
          ],
        }),
      ),
    );
    await expect(
      new ForgejoActionsAdapter(fetchFn).listWorkflowRuns(context, {
        providerRepositoryId: '1',
        owner: 'org',
        name: 'repo',
      }),
    ).resolves.toMatchObject([{ providerRunId: '7', status: 'SUCCESS', durationMs: 120_000 }]);
  });
  it('explains when a Forgejo server has no Actions run API', async () => {
    const adapter = new ForgejoActionsAdapter(jest.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(
      adapter.listWorkflowRuns(context, { providerRepositoryId: '1', owner: 'org', name: 'repo' }),
    ).rejects.toBeInstanceOf(ForgejoActionsUnsupportedError);
  });
});
