import { createHmac } from 'node:crypto';

import { GitHubActionsAdapter } from './github-actions.adapter.js';

describe('GitHubActionsAdapter', () => {
  const context = { accessToken: 'token', baseUrl: null, providerAccountId: 'account' };

  it('maps repositories and normalizes workflow runs through read-only requests', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 1,
              name: 'flowpeek',
              full_name: 'octo/flowpeek',
              html_url: 'https://github.com/octo/flowpeek',
              owner: { login: 'octo' },
            },
          ]),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workflow_runs: [
              {
                id: 7,
                name: 'CI',
                html_url: 'https://github.com/octo/flowpeek/actions/runs/7',
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
    const adapter = new GitHubActionsAdapter(fetchFn);

    await expect(adapter.listRepositories(context)).resolves.toEqual([
      { providerRepositoryId: '1', owner: 'octo', name: 'flowpeek', url: 'https://github.com/octo/flowpeek' },
    ]);
    await expect(
      adapter.listWorkflowRuns(context, { providerRepositoryId: '1', owner: 'octo', name: 'flowpeek' }),
    ).resolves.toMatchObject([{ providerRunId: '7', status: 'SUCCESS', durationMs: 120_000 }]);
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('/user/repos'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    );
  });

  it('accepts only correctly signed GitHub webhooks', async () => {
    const adapter = new GitHubActionsAdapter();
    const payload = new TextEncoder().encode(JSON.stringify({ repository: { id: 1 } }));
    const signature = `sha256=${createHmac('sha256', 'secret').update(payload).digest('hex')}`;

    await expect(
      adapter.verifyWebhook({
        headers: { 'x-github-event': 'workflow_run', 'x-hub-signature-256': signature },
        payload,
        signingSecret: 'secret',
      }),
    ).resolves.toEqual({ event: 'workflow_run', providerRepositoryId: '1' });
  });
});
