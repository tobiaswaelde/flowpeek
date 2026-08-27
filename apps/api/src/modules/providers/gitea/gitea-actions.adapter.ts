import { createHmac, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import type {
  ProviderAccountContext,
  ProviderAccountValidation,
  ProviderAdapter,
  ProviderRepository,
  ProviderRepositoryReference,
  ProviderWebhookRequest,
  ProviderWorkflowRun,
  VerifiedWebhook,
} from '../provider-adapter.js';
import { PROVIDER_FETCH } from '../provider-adapter.js';
import { normalizeWorkflowRunStatus } from '../workflow-status.js';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface GiteaRepository {
  html_url: string;
  id: number;
  name: string;
  owner: { login: string };
}

interface GiteaWorkflowRun {
  completed_at?: string | null;
  conclusion?: string | null;
  created_at: string;
  html_url: string;
  id: number;
  name?: string;
  run_started_at?: string | null;
  status: string;
  updated_at: string;
  workflow_name?: string;
}

interface GiteaWorkflowRunsResponse {
  workflow_runs?: GiteaWorkflowRun[];
}

/** Raised when a Gitea instance does not expose the read-only Actions run API. */
export class GiteaActionsUnsupportedError extends Error {
  constructor() {
    super(
      'This Gitea server does not expose the Actions workflow-run API. Upgrade Gitea or disable Actions synchronization for this account.',
    );
  }
}

/** Gitea adapter for read-only repository and Actions workflow-run synchronization. */
@Injectable()
export class GiteaActionsAdapter implements ProviderAdapter {
  readonly providerType = 'GITEA' as const;

  constructor(@Inject(PROVIDER_FETCH) private readonly fetchFn: FetchLike = fetch) {}

  async validateAccount(context: ProviderAccountContext): Promise<ProviderAccountValidation> {
    const user = await this.request<{ login: string }>(context, '/user');
    return { displayName: user.login, valid: true };
  }

  async listRepositories(context: ProviderAccountContext): Promise<ProviderRepository[]> {
    const repositories = await this.request<GiteaRepository[]>(context, '/user/repos?limit=100');
    return repositories.map((repository) => ({
      name: repository.name,
      owner: repository.owner.login,
      providerRepositoryId: String(repository.id),
      url: repository.html_url,
    }));
  }

  async listWorkflowRuns(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
  ): Promise<ProviderWorkflowRun[]> {
    const data = await this.actionsRequest<GiteaWorkflowRunsResponse>(
      context,
      `/repos/${repository.owner}/${repository.name}/actions/runs?limit=100`,
    );
    return (data.workflow_runs ?? []).map((run) => this.toWorkflowRun(run));
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
    if (!response.ok) throw new Error(`Gitea API request failed with status ${response.status}.`);
    return this.toWorkflowRun((await response.json()) as GiteaWorkflowRun);
  }

  async verifyWebhook(request: ProviderWebhookRequest): Promise<VerifiedWebhook | null> {
    const signature = request.headers['x-gitea-signature'];
    const event = request.headers['x-gitea-event'];
    if (typeof signature !== 'string' || typeof event !== 'string') return null;

    const expected = createHmac('sha256', request.signingSecret).update(request.payload).digest('hex');
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      return null;

    const payload = JSON.parse(Buffer.from(request.payload).toString('utf8')) as { repository?: { id?: number } };
    return { event, providerRepositoryId: payload.repository?.id ? String(payload.repository.id) : null };
  }

  private async request<T>(context: ProviderAccountContext, path: string): Promise<T> {
    const response = await this.fetchFn(this.url(context, path), { headers: this.headers(context) });
    if (!response.ok) throw new Error(`Gitea API request failed with status ${response.status}.`);
    return (await response.json()) as T;
  }

  private async actionsRequest<T>(context: ProviderAccountContext, path: string): Promise<T> {
    const response = await this.fetchFn(this.url(context, path), { headers: this.headers(context) });
    if (response.status === 404) throw new GiteaActionsUnsupportedError();
    if (!response.ok) throw new Error(`Gitea API request failed with status ${response.status}.`);
    return (await response.json()) as T;
  }

  private headers(context: ProviderAccountContext): HeadersInit {
    return { Accept: 'application/json', Authorization: `token ${context.accessToken}` };
  }

  private url(context: ProviderAccountContext, path: string): string {
    const baseUrl = (context.baseUrl ?? '').replace(/\/$/, '');
    return `${baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`}${path}`;
  }

  private toWorkflowRun(run: GiteaWorkflowRun): ProviderWorkflowRun {
    const startedAt = run.run_started_at ? new Date(run.run_started_at) : null;
    const completedAt = run.completed_at
      ? new Date(run.completed_at)
      : run.status === 'completed'
        ? new Date(run.updated_at)
        : null;
    return {
      completedAt,
      durationMs: startedAt && completedAt ? completedAt.getTime() - startedAt.getTime() : null,
      providerCreatedAt: new Date(run.created_at),
      providerRunId: String(run.id),
      rawStatus: run.conclusion ?? run.status,
      startedAt,
      status: normalizeWorkflowRunStatus('GITEA', run.status, run.conclusion ?? null),
      url: run.html_url,
      workflowName: run.workflow_name ?? run.name ?? 'Workflow',
    };
  }
}
