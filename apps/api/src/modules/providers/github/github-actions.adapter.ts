import { createHmac, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import type {
  ProviderAccountContext,
  ProviderAccountValidation,
  ProviderAdapter,
  ProviderChangeRequestState,
  ProviderRepository,
  ProviderRepositoryReference,
  ProviderWebhookRequest,
  ProviderWorkflowRun,
  VerifiedWebhook,
} from '../provider-adapter.js';
import { buildWorkflowRunScopeKey, PROVIDER_FETCH } from '../provider-adapter.js';
import { isWorkflowRunAwaitingApproval, normalizeWorkflowRunStatus } from '../workflow-status.js';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface GitHubRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  owner: { login: string };
}
interface GitHubWorkflowRunResponse {
  display_title?: string;
  event?: string;
  head_branch?: string | null;
  head_sha?: string | null;
  id: number;
  name: string;
  path?: string;
  html_url: string;
  created_at: string;
  run_started_at: string | null;
  updated_at: string;
  status: string;
  conclusion: string | null;
  pull_requests?: { number: number }[];
  workflow_id?: number;
}
interface GitHubPullRequestResponse {
  base?: { ref?: string };
  merged_at?: string | null;
  state: string;
}

const dependabotWorkflowPath = 'dynamic/dependabot/dependabot-updates';

/** GitHub Actions adapter that only reads repositories, runs, and webhook metadata. */
@Injectable()
export class GitHubActionsAdapter implements ProviderAdapter {
  readonly providerType = 'GITHUB' as const;

  constructor(@Inject(PROVIDER_FETCH) private readonly fetchFn: FetchLike = fetch) {}

  async validateAccount(context: ProviderAccountContext): Promise<ProviderAccountValidation> {
    const account = await this.request<{ login: string }>(context, '/user');
    return { displayName: account.login, valid: true };
  }

  async listRepositories(context: ProviderAccountContext): Promise<ProviderRepository[]> {
    const repositories = await this.request<GitHubRepositoryResponse[]>(context, '/user/repos?per_page=100');
    return repositories.map((repository) => this.toRepository(repository));
  }

  async getChangeRequestState(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
    changeRequestNumber: string,
  ): Promise<ProviderChangeRequestState | null> {
    const response = await this.fetchFn(
      this.url(context, `/repos/${repository.owner}/${repository.name}/pulls/${changeRequestNumber}`),
      { headers: this.headers(context) },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub API request failed with status ${response.status}.`);
    const pullRequest = (await response.json()) as GitHubPullRequestResponse;
    const mergedAt = pullRequest.merged_at ? new Date(pullRequest.merged_at) : null;
    return {
      mergedAt,
      state: mergedAt ? 'MERGED' : pullRequest.state === 'closed' ? 'CLOSED' : 'OPEN',
      targetBranch: pullRequest.base?.ref ?? null,
    };
  }

  async getRepository(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
  ): Promise<ProviderRepository | null> {
    const response = await this.fetchFn(this.url(context, `/repos/${repository.owner}/${repository.name}`), {
      headers: this.headers(context),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub API request failed with status ${response.status}.`);
    return this.toRepository((await response.json()) as GitHubRepositoryResponse);
  }

  async listWorkflowRuns(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
    updatedAfter?: Date,
  ): Promise<ProviderWorkflowRun[]> {
    const query = new URLSearchParams({ per_page: '100' });
    if (updatedAfter) query.set('created', `>=${updatedAfter.toISOString()}`);
    const response = await this.request<{ workflow_runs: GitHubWorkflowRunResponse[] }>(
      context,
      `/repos/${repository.owner}/${repository.name}/actions/runs?${query}`,
    );
    return response.workflow_runs.map((run) => this.toWorkflowRun(run, repository));
  }

  async getWorkflowRun(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
    providerRunId: string,
  ): Promise<ProviderWorkflowRun | null> {
    const response = await this.fetchFn(
      this.url(context, `/repos/${repository.owner}/${repository.name}/actions/runs/${providerRunId}`),
      { headers: this.headers(context) },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub API request failed with status ${response.status}.`);
    return this.toWorkflowRun((await response.json()) as GitHubWorkflowRunResponse, repository);
  }

  async verifyWebhook(request: ProviderWebhookRequest): Promise<VerifiedWebhook | null> {
    const signature = request.headers['x-hub-signature-256'];
    const event = request.headers['x-github-event'];
    if (typeof signature !== 'string' || typeof event !== 'string') return null;
    const expected = `sha256=${createHmac('sha256', request.signingSecret).update(request.payload).digest('hex')}`;
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      return null;
    const payload = JSON.parse(Buffer.from(request.payload).toString('utf8')) as { repository?: { id?: number } };
    return { event, providerRepositoryId: payload.repository?.id ? String(payload.repository.id) : null };
  }

  private async request<T>(context: ProviderAccountContext, path: string): Promise<T> {
    const response = await this.fetchFn(this.url(context, path), { headers: this.headers(context) });
    if (!response.ok) throw new Error(`GitHub API request failed with status ${response.status}.`);
    return (await response.json()) as T;
  }

  private headers(context: ProviderAccountContext): HeadersInit {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${context.accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }
  private toRepository(repository: GitHubRepositoryResponse): ProviderRepository {
    return {
      providerRepositoryId: String(repository.id),
      owner: repository.owner.login,
      name: repository.name,
      url: repository.html_url,
    };
  }
  private url(context: ProviderAccountContext, path: string): string {
    return `${(context.baseUrl ?? 'https://api.github.com').replace(/\/$/, '')}${path}`;
  }
  private toWorkflowRun(run: GitHubWorkflowRunResponse, repository: ProviderRepositoryReference): ProviderWorkflowRun {
    const startedAt = run.run_started_at ? new Date(run.run_started_at) : null;
    const completedAt = run.status === 'completed' ? new Date(run.updated_at) : null;
    const changeRequestNumber = run.pull_requests?.[0]?.number?.toString() ?? null;
    const headBranch = run.head_branch ?? null;
    const workflowPath = run.path ?? null;
    const workflowKind = workflowPath === dependabotWorkflowPath ? 'DEPENDABOT_INTERNAL' : 'STANDARD';
    const workflowName = workflowKind === 'DEPENDABOT_INTERNAL' ? 'Dependabot Updates' : run.name;
    return {
      awaitingApproval: isWorkflowRunAwaitingApproval('GITHUB', run.status, run.conclusion),
      changeRequestNumber,
      displayTitle: run.display_title ?? run.name,
      event: run.event ?? null,
      headBranch,
      headSha: run.head_sha ?? null,
      providerRunId: String(run.id),
      providerWorkflowId: run.workflow_id ? String(run.workflow_id) : (workflowPath ?? `name:${workflowName}`),
      url: run.html_url,
      providerCreatedAt: new Date(run.created_at),
      startedAt,
      completedAt,
      durationMs: startedAt && completedAt ? completedAt.getTime() - startedAt.getTime() : null,
      status: normalizeWorkflowRunStatus('GITHUB', run.status, run.conclusion),
      rawStatus: run.conclusion ?? run.status,
      reviewUrl: this.githubPullRequestUrl(run, repository),
      scopeKey: buildWorkflowRunScopeKey(changeRequestNumber, headBranch),
      workflowKind,
      workflowName,
      workflowPath,
    };
  }

  private githubPullRequestUrl(run: GitHubWorkflowRunResponse, repository: ProviderRepositoryReference): string | null {
    const pullRequestNumber = run.pull_requests?.[0]?.number;
    if (!pullRequestNumber) return null;
    return `${new URL(run.html_url).origin}/${repository.owner}/${repository.name}/pull/${pullRequestNumber}`;
  }
}
