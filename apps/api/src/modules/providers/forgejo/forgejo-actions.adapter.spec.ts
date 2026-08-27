import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ForgejoActionsAdapter, ForgejoActionsUnsupportedError } from './forgejo-actions.adapter.js';

const fixtureDirectory = resolve(__dirname, 'fixtures');
const readFixture = (name: string): unknown => JSON.parse(readFileSync(resolve(fixtureDirectory, name), 'utf8'));

describe('ForgejoActionsAdapter', () => {
  const context = { accessToken: 'token', baseUrl: 'https://forgejo.example.test', providerAccountId: 'account' };
  it('maps Actions workflow runs through the read-only API', async () => {
    const fetchFn = jest.fn().mockResolvedValue(new Response(JSON.stringify(readFixture('workflow-runs.json'))));
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
  it('verifies Forgejo HMAC signatures while retaining Gitea header compatibility', async () => {
    const adapter = new ForgejoActionsAdapter();
    const payload = Buffer.from(JSON.stringify(readFixture('webhook.json')));
    const signature = createHmac('sha256', 'webhook-secret').update(payload).digest('hex');

    await expect(
      adapter.verifyWebhook({
        headers: {
          'x-forgejo-event': 'push',
          'x-forgejo-signature': signature,
        },
        payload,
        signingSecret: 'webhook-secret',
      }),
    ).resolves.toEqual({ event: 'push', providerRepositoryId: '42' });
  });
});
