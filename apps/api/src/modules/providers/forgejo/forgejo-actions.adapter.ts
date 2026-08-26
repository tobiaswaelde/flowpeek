import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';

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
import { normalizeWorkflowRunStatus } from '../workflow-status.js';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
interface ForgejoRepository {
  id: number;
  name: string;
  html_url: string;
  owner: { login: string };
}
interface ForgejoRun {
  id: number;
  name?: string;
  workflow_name?: string;
  html_url: string;
  created_at: string;
  run_started_at?: string | null;
  updated_at: string;
  status: string;
  conclusion?: string | null;
}

/** Raised when a Forgejo instance predates the read-only Actions run API. */
export class ForgejoActionsUnsupportedError extends Error {
  constructor() {
    super(
      'This Forgejo server does not expose the Actions workflow-run API. Upgrade Forgejo or disable Actions synchronization for this account.',
    );
  }
}

/** Forgejo adapter for read-only repository and Actions workflow-run synchronization. */
@Injectable()
export class ForgejoActionsAdapter implements ProviderAdapter {
  readonly providerType = 'FORGEJO' as const;
  constructor(private readonly fetchFn: FetchLike = fetch) {}

  async validateAccount(context: ProviderAccountContext): Promise<ProviderAccountValidation> {
    const user = await this.request<{ login: string }>(context, '/user');
    return { displayName: user.login, valid: true };
  }
  async listRepositories(context: ProviderAccountContext): Promise<ProviderRepository[]> {
    const repositories = await this.request<ForgejoRepository[]>(context, '/user/repos?limit=100');
    return repositories.map((repository) => ({
      providerRepositoryId: String(repository.id),
      owner: repository.owner.login,
      name: repository.name,
      url: repository.html_url,
    }));
  }
  async listWorkflowRuns(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
    updatedAfter?: Date,
  ): Promise<ProviderWorkflowRun[]> {
    const query = new URLSearchParams({ limit: '100' });
    if (updatedAfter) query.set('created_after', updatedAfter.toISOString());
    const data = await this.actionsRequest<{ workflow_runs?: ForgejoRun[] } | ForgejoRun[]>(
      context,
      `/repos/${repository.owner}/${repository.name}/actions/runs?${query}`,
    );
    return (Array.isArray(data) ? data : (data.workflow_runs ?? [])).map((run) => this.toWorkflowRun(run));
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
    if (!response.ok) throw new Error(`Forgejo API request failed with status ${response.status}.`);
    return this.toWorkflowRun((await response.json()) as ForgejoRun);
  }
  async verifyWebhook(request: ProviderWebhookRequest): Promise<VerifiedWebhook | null> {
    const signature = request.headers['x-forgejo-signature'] ?? request.headers['x-gitea-signature'];
    const event = request.headers['x-forgejo-event'] ?? request.headers['x-gitea-event'];
    if (typeof signature !== 'string' || typeof event !== 'string') return null;
    const expected = createHmac('sha256', request.signingSecret).update(request.payload).digest('hex');
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      return null;
    const payload = JSON.parse(Buffer.from(request.payload).toString('utf8')) as { repository?: { id?: number } };
    return { event, providerRepositoryId: payload.repository?.id ? String(payload.repository.id) : null };
  }
  private async request<T>(context: ProviderAccountContext, path: string): Promise<T> {
    const response = await this.fetchFn(this.url(context, path), { headers: this.headers(context) });
    if (!response.ok) throw new Error(`Forgejo API request failed with status ${response.status}.`);
    return (await response.json()) as T;
  }
  private async actionsRequest<T>(context: ProviderAccountContext, path: string): Promise<T> {
    const response = await this.fetchFn(this.url(context, path), { headers: this.headers(context) });
    if (response.status === 404) throw new ForgejoActionsUnsupportedError();
    if (!response.ok) throw new Error(`Forgejo API request failed with status ${response.status}.`);
    return (await response.json()) as T;
  }
  private headers(context: ProviderAccountContext): HeadersInit {
    return { Accept: 'application/json', Authorization: `token ${context.accessToken}` };
  }
  private url(context: ProviderAccountContext, path: string): string {
    const baseUrl = (context.baseUrl ?? '').replace(/\/$/, '');
    return `${baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`}${path}`;
  }
  private toWorkflowRun(run: ForgejoRun): ProviderWorkflowRun {
    const startedAt = run.run_started_at ? new Date(run.run_started_at) : null;
    const completedAt = run.status === 'completed' ? new Date(run.updated_at) : null;
    return {
      providerRunId: String(run.id),
      workflowName: run.workflow_name ?? run.name ?? 'Workflow',
      url: run.html_url,
      providerCreatedAt: new Date(run.created_at),
      startedAt,
      completedAt,
      durationMs: startedAt && completedAt ? completedAt.getTime() - startedAt.getTime() : null,
      status: normalizeWorkflowRunStatus('FORGEJO', run.status, run.conclusion ?? null),
      rawStatus: run.conclusion ?? run.status,
    };
  }
}
