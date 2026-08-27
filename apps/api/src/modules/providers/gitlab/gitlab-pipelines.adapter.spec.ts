import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { GitLabPipelinesAdapter } from './gitlab-pipelines.adapter.js';

const fixtureDirectory = resolve(__dirname, 'fixtures');
const readFixture = (name: string): unknown => JSON.parse(readFileSync(resolve(fixtureDirectory, name), 'utf8'));

describe('GitLabPipelinesAdapter', () => {
  const context = { accessToken: 'token', baseUrl: 'https://gitlab.example.test', providerAccountId: 'account' };

  it('maps projects and pipelines using only GitLab read endpoints', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(readFixture('projects.json'))))
      .mockResolvedValueOnce(new Response(JSON.stringify(readFixture('pipelines.json'))));
    const adapter = new GitLabPipelinesAdapter(fetchFn);

    await expect(adapter.listRepositories(context)).resolves.toEqual([
      {
        providerRepositoryId: '1',
        owner: 'group',
        name: 'flowpeek',
        url: 'https://gitlab.example.test/group/flowpeek',
      },
    ]);
    await expect(
      adapter.listWorkflowRuns(context, { providerRepositoryId: '1', owner: 'group', name: 'flowpeek' }),
    ).resolves.toMatchObject([{ providerRunId: '7', workflowName: 'main', status: 'SUCCESS', durationMs: 120_000 }]);
    expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining('/api/v4/projects'), expect.anything());
  });

  it('verifies current GitLab HMAC signing tokens against the raw delivery body', async () => {
    const adapter = new GitLabPipelinesAdapter();
    const payload = Buffer.from(JSON.stringify(readFixture('webhook.json')));
    const signingSecret = `whsec_${Buffer.from('signing-key').toString('base64')}`;
    const id = 'delivery-id';
    const timestamp = '1787745600';
    const signature = `v1,${createHmac('sha256', 'signing-key')
      .update(`${id}.${timestamp}.${payload.toString('utf8')}`)
      .digest('base64')}`;

    await expect(
      adapter.verifyWebhook({
        headers: {
          'webhook-id': id,
          'webhook-signature': signature,
          'webhook-timestamp': timestamp,
          'x-gitlab-event': 'Pipeline Hook',
        },
        payload,
        signingSecret,
      }),
    ).resolves.toEqual({ event: 'Pipeline Hook', providerRepositoryId: '42' });
  });
});
