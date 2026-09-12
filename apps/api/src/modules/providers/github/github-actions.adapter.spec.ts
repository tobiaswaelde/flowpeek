import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { GitHubActionsAdapter } from './github-actions.adapter.js';

const fixtureDirectory = resolve(__dirname, 'fixtures');
const readFixture = (name: string): unknown => JSON.parse(readFileSync(resolve(fixtureDirectory, name), 'utf8'));

describe('GitHubActionsAdapter', () => {
  const context = { accessToken: 'token', baseUrl: null, providerAccountId: 'account' };

  it('retains GitHub rate-limit timing without exposing the response body', async () => {
    const adapter = new GitHubActionsAdapter(
      jest.fn().mockResolvedValue(new Response('sensitive', { headers: { 'retry-after': '60' }, status: 429 })),
    );

    await expect(adapter.listRepositories(context)).rejects.toMatchObject({
      message: 'GitHub API request failed with status 429.',
      retryAt: expect.any(Date),
      status: 429,
    });
  });

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
    ).resolves.toMatchObject([
      {
        displayTitle: 'CI',
        durationMs: 120_000,
        event: 'push',
        headBranch: 'main',
        headSha: '0123456789abcdef',
        providerRunId: '7',
        providerWorkflowId: '17',
        scopeKey: 'branch:main',
        status: 'SUCCESS',
        workflowKind: 'STANDARD',
        workflowName: 'CI',
        workflowPath: '.github/workflows/ci.yml',
      },
    ]);
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('/user/repos'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    );
  });

  it('resolves renamed repository metadata through the previous repository path', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          name: 'renamed',
          html_url: 'https://github.com/new-owner/renamed',
          owner: { login: 'new-owner' },
        }),
      ),
    );

    await expect(
      new GitHubActionsAdapter(fetchFn).getRepository(context, {
        providerRepositoryId: '1',
        owner: 'octo',
        name: 'flowpeek',
      }),
    ).resolves.toEqual({
      providerRepositoryId: '1',
      owner: 'new-owner',
      name: 'renamed',
      url: 'https://github.com/new-owner/renamed',
    });
    expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining('/repos/octo/flowpeek'), expect.anything());
  });

  it('returns null when the tracked GitHub repository is unavailable', async () => {
    const adapter = new GitHubActionsAdapter(jest.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(
      adapter.getRepository(context, { providerRepositoryId: '1', owner: 'octo', name: 'missing' }),
    ).resolves.toBeNull();
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
              workflow_id: 18,
              path: '.github/workflows/deploy.yml',
              display_title: 'Deploy pull request',
              event: 'pull_request',
              head_branch: 'feature/deploy',
              head_sha: 'abcdef',
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
        changeRequestNumber: '42',
        displayTitle: 'Deploy pull request',
        reviewUrl: 'https://github.com/octo/flowpeek/pull/42',
        scopeKey: 'change-request:42',
        status: 'QUEUED',
      },
    ]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('classifies dynamic Dependabot updates under one stable internal workflow', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          workflow_runs: [
            {
              conclusion: 'failure',
              created_at: '2026-09-09T12:52:58Z',
              display_title: 'npm_and_yarn in /. for brace-expansion - Update #1566127419',
              event: 'dynamic',
              head_branch: 'main',
              head_sha: '3ba01f8e',
              html_url: 'https://github.com/octo/flowpeek/actions/runs/34353631785',
              id: 34353631785,
              name: 'npm_and_yarn in /. for brace-expansion - Update #1566127419',
              path: 'dynamic/dependabot/dependabot-updates',
              pull_requests: [],
              run_started_at: '2026-09-09T12:53:01Z',
              status: 'completed',
              updated_at: '2026-09-09T12:54:11Z',
              workflow_id: 204858725,
            },
            {
              conclusion: 'failure',
              created_at: '2026-09-09T12:23:48Z',
              display_title: 'npm_and_yarn in /. for brace-expansion - Update #1566075990',
              event: 'dynamic',
              head_branch: 'main',
              head_sha: '53df4d60',
              html_url: 'https://github.com/octo/flowpeek/actions/runs/34350764213',
              id: 34350764213,
              name: 'npm_and_yarn in /. for brace-expansion - Update #1566075990',
              path: 'dynamic/dependabot/dependabot-updates',
              pull_requests: [],
              run_started_at: '2026-09-09T12:24:00Z',
              status: 'completed',
              updated_at: '2026-09-09T12:24:39Z',
              workflow_id: 204858725,
            },
          ],
        }),
      ),
    );

    const runs = await new GitHubActionsAdapter(fetchFn).listWorkflowRuns(context, {
      name: 'flowpeek',
      owner: 'octo',
      providerRepositoryId: '1',
    });

    expect(runs).toHaveLength(2);
    expect(runs.map((run) => run.providerWorkflowId)).toEqual(['204858725', '204858725']);
    expect(runs.map((run) => run.workflowName)).toEqual(['Dependabot Updates', 'Dependabot Updates']);
    expect(runs.map((run) => run.workflowKind)).toEqual(['DEPENDABOT_INTERNAL', 'DEPENDABOT_INTERNAL']);
    expect(runs.map((run) => run.displayTitle)).toEqual([
      'npm_and_yarn in /. for brace-expansion - Update #1566127419',
      'npm_and_yarn in /. for brace-expansion - Update #1566075990',
    ]);
  });
});

describe('GitHubActionsAdapter change requests', () => {
  const context = { accessToken: 'token', baseUrl: null, providerAccountId: 'account' };
  const repository = { name: 'flowpeek', owner: 'octo', providerRepositoryId: '1' };

  it.each([
    ['open', null, 'OPEN'],
    ['closed', null, 'CLOSED'],
    ['closed', '2026-09-12T10:00:00.000Z', 'MERGED'],
  ] as const)('normalizes a %s pull request with merged-at %s as %s', async (state, mergedAt, expected) => {
    const adapter = new GitHubActionsAdapter(
      jest.fn().mockResolvedValue(new Response(JSON.stringify({ base: { ref: 'main' }, merged_at: mergedAt, state }))),
    );

    await expect(adapter.getChangeRequestState(context, repository, '42')).resolves.toEqual({
      mergedAt: mergedAt ? new Date(mergedAt) : null,
      state: expected,
      targetBranch: 'main',
    });
  });

  it('returns null when the pull request is unavailable', async () => {
    const adapter = new GitHubActionsAdapter(jest.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(adapter.getChangeRequestState(context, repository, '42')).resolves.toBeNull();
  });
});
