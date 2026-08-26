import { createHmac } from 'node:crypto';

import { GitLabPipelinesAdapter } from './gitlab-pipelines.adapter.js';

describe('GitLabPipelinesAdapter', () => {
  const context = { accessToken: 'token', baseUrl: 'https://gitlab.example.test', providerAccountId: 'account' };

  it('maps projects and pipelines using only GitLab read endpoints', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 1,
              name: 'flowpeek',
              web_url: 'https://gitlab.example.test/group/flowpeek',
              namespace: { full_path: 'group' },
            },
          ]),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 7,
              status: 'success',
              web_url: 'https://gitlab.example.test/group/flowpeek/-/pipelines/7',
              created_at: '2026-08-01T10:00:00Z',
              updated_at: '2026-08-01T10:03:00Z',
              started_at: '2026-08-01T10:01:00Z',
              finished_at: '2026-08-01T10:03:00Z',
              duration: 120,
              ref: 'main',
            },
          ]),
        ),
      );
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
    const payload = Buffer.from('{"project":{"id":42}}');
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
