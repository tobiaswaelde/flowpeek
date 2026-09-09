import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { GitHubActionsAdapter } from './github-actions.adapter.js';

const fixtureDirectory = resolve(__dirname, 'fixtures');
const readFixture = (name: string): unknown => JSON.parse(readFileSync(resolve(fixtureDirectory, name), 'utf8'));

describe('GitHubActionsAdapter', () => {
  const context = { accessToken: 'token', baseUrl: null, providerAccountId: 'account' };

  it('maps repositories and normalizes workflow runs through read-only requests', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(readFixture('repositories.json'))))
      .mockResolvedValueOnce(new Response(JSON.stringify(readFixture('workflow-runs.json'))));
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
    const payload = Buffer.from(JSON.stringify(readFixture('webhook.json')));
    const signature = `sha256=${createHmac('sha256', 'secret').update(payload).digest('hex')}`;

    await expect(
      adapter.verifyWebhook({
        headers: { 'x-github-event': 'workflow_run', 'x-hub-signature-256': signature },
        payload,
        signingSecret: 'secret',
      }),
    ).resolves.toEqual({ event: 'workflow_run', providerRepositoryId: '1' });
  });

  it('maps waiting runs and their pull request without issuing a provider write', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          workflow_runs: [
            {
              conclusion: null,
              created_at: '2026-09-09T08:00:00Z',
              html_url: 'https://github.com/octo/flowpeek/actions/runs/8',
              id: 8,
              name: 'Deploy',
              pull_requests: [{ number: 42 }],
              run_started_at: '2026-09-09T08:01:00Z',
              status: 'waiting',
              updated_at: '2026-09-09T08:02:00Z',
            },
          ],
        }),
      ),
    );
    const adapter = new GitHubActionsAdapter(fetchFn);

    await expect(
      adapter.listWorkflowRuns(context, { providerRepositoryId: '1', owner: 'octo', name: 'flowpeek' }),
    ).resolves.toMatchObject([
      {
        awaitingApproval: true,
        reviewUrl: 'https://github.com/octo/flowpeek/pull/42',
        status: 'QUEUED',
      },
    ]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
