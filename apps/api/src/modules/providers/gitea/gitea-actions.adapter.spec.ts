import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { GiteaActionsAdapter, GiteaActionsUnsupportedError } from './gitea-actions.adapter.js';

const fixtureDirectory = resolve(__dirname, 'fixtures');

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(fixtureDirectory, name), 'utf8'));
}

describe('GiteaActionsAdapter', () => {
  const context = { accessToken: 'token', baseUrl: 'https://gitea.example.test', providerAccountId: 'account' };
  const repository = { providerRepositoryId: '42', owner: 'flowpeek', name: 'flowpeek' };

  it('discovers repositories and maps Actions workflow runs from recorded read-only API fixtures', async () => {
    const fetchFn = jest.fn(async (url: string) => {
      if (url.endsWith('/user')) return new Response(JSON.stringify(readFixture('user.json')));
      if (url.includes('/user/repos')) return new Response(JSON.stringify(readFixture('repositories.json')));
      if (url.includes('/actions/runs?')) return new Response(JSON.stringify(readFixture('workflow-runs.json')));
      if (url.endsWith('/actions/runs/7')) return new Response(JSON.stringify(readFixture('workflow-run.json')));
      throw new Error(`Unexpected request: ${url}`);
    });
    const adapter = new GiteaActionsAdapter(fetchFn);

    await expect(adapter.validateAccount(context)).resolves.toEqual({ displayName: 'flowpeek-bot', valid: true });
    await expect(adapter.listRepositories(context)).resolves.toEqual([
      {
        providerRepositoryId: '42',
        owner: 'flowpeek',
        name: 'flowpeek',
        url: 'https://gitea.example.test/flowpeek/flowpeek',
      },
    ]);
    await expect(adapter.listWorkflowRuns(context, repository)).resolves.toMatchObject([
      {
        providerRunId: '7',
        workflowName: 'CI',
        status: 'SUCCESS',
        durationMs: 120_000,
      },
    ]);
    await expect(adapter.getWorkflowRun(context, repository, '7')).resolves.toMatchObject({
      providerRunId: '7',
      status: 'SUCCESS',
    });
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('reports unsupported Actions servers without attempting a provider write', async () => {
    const adapter = new GiteaActionsAdapter(jest.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(adapter.listWorkflowRuns(context, repository)).rejects.toBeInstanceOf(GiteaActionsUnsupportedError);
  });

  it('validates a recorded Gitea webhook using the raw JSON payload', async () => {
    const payload = Buffer.from(JSON.stringify(readFixture('webhook.json')));
    const signature = createHmac('sha256', 'webhook-secret').update(payload).digest('hex');
    const adapter = new GiteaActionsAdapter();

    await expect(
      adapter.verifyWebhook({
        headers: { 'x-gitea-event': 'workflow_run', 'x-gitea-signature': signature },
        payload,
        signingSecret: 'webhook-secret',
      }),
    ).resolves.toEqual({ event: 'workflow_run', providerRepositoryId: '42' });
  });
});
