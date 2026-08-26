import { timingSafeEqual } from 'node:crypto';

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

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
interface GitLabProject {
  id: number;
  name: string;
  web_url: string;
  namespace: { full_path: string };
}
interface GitLabPipeline {
  id: number;
  status: string;
  web_url: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  name?: string;
  ref?: string;
}

/** GitLab adapter that only reads projects and pipelines. */
@Injectable()
export class GitLabPipelinesAdapter implements ProviderAdapter {
  readonly providerType = 'GITLAB' as const;

  constructor(private readonly fetchFn: FetchLike = fetch) {}

  async validateAccount(context: ProviderAccountContext): Promise<ProviderAccountValidation> {
    const user = await this.request<{ username: string }>(context, '/user');
    return { displayName: user.username, valid: true };
  }

  async listRepositories(context: ProviderAccountContext): Promise<ProviderRepository[]> {
    const projects = await this.request<GitLabProject[]>(context, '/projects?membership=true&simple=true&per_page=100');
    return projects.map((project) => ({
      providerRepositoryId: String(project.id),
      owner: project.namespace.full_path,
      name: project.name,
      url: project.web_url,
    }));
  }

  async listWorkflowRuns(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
    updatedAfter?: Date,
  ): Promise<ProviderWorkflowRun[]> {
    const query = new URLSearchParams({ per_page: '100', order_by: 'updated_at', sort: 'desc' });
    if (updatedAfter) query.set('updated_after', updatedAfter.toISOString());
    const pipelines = await this.request<GitLabPipeline[]>(
      context,
      `/projects/${encodeURIComponent(repository.providerRepositoryId)}/pipelines?${query}`,
    );
    return pipelines.map((pipeline) => this.toWorkflowRun(pipeline));
  }

  async getWorkflowRun(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
    providerRunId: string,
  ): Promise<ProviderWorkflowRun | null> {
    const response = await this.fetchFn(
      this.url(context, `/projects/${encodeURIComponent(repository.providerRepositoryId)}/pipelines/${providerRunId}`),
      { headers: this.headers(context) },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitLab API request failed with status ${response.status}.`);
    return this.toWorkflowRun((await response.json()) as GitLabPipeline);
  }

  async verifyWebhook(request: ProviderWebhookRequest): Promise<VerifiedWebhook | null> {
    const token = request.headers['x-gitlab-token'];
    const event = request.headers['x-gitlab-event'];
    if (typeof token !== 'string' || typeof event !== 'string' || token.length !== request.signingSecret.length)
      return null;
    if (!timingSafeEqual(Buffer.from(token), Buffer.from(request.signingSecret))) return null;
    const payload = JSON.parse(Buffer.from(request.payload).toString('utf8')) as { project?: { id?: number } };
    return { event, providerRepositoryId: payload.project?.id ? String(payload.project.id) : null };
  }

  private async request<T>(context: ProviderAccountContext, path: string): Promise<T> {
    const response = await this.fetchFn(this.url(context, path), { headers: this.headers(context) });
    if (!response.ok) throw new Error(`GitLab API request failed with status ${response.status}.`);
    return (await response.json()) as T;
  }
  private headers(context: ProviderAccountContext): HeadersInit {
    return { Accept: 'application/json', Authorization: `Bearer ${context.accessToken}` };
  }
  private url(context: ProviderAccountContext, path: string): string {
    const baseUrl = (context.baseUrl ?? 'https://gitlab.com').replace(/\/$/, '');
    return `${baseUrl.endsWith('/api/v4') ? baseUrl : `${baseUrl}/api/v4`}${path}`;
  }
  private toWorkflowRun(pipeline: GitLabPipeline): ProviderWorkflowRun {
    const startedAt = pipeline.started_at ? new Date(pipeline.started_at) : null;
    const completedAt = pipeline.finished_at ? new Date(pipeline.finished_at) : null;
    return {
      providerRunId: String(pipeline.id),
      workflowName: pipeline.name ?? pipeline.ref ?? 'Pipeline',
      url: pipeline.web_url,
      providerCreatedAt: new Date(pipeline.created_at),
      startedAt,
      completedAt,
      durationMs:
        pipeline.duration === null
          ? startedAt && completedAt
            ? completedAt.getTime() - startedAt.getTime()
            : null
          : pipeline.duration * 1000,
      status: this.status(pipeline.status),
      rawStatus: pipeline.status,
    };
  }
  private status(status: string): ProviderWorkflowRun['status'] {
    return (
      (
        {
          success: 'SUCCESS',
          failed: 'FAILED',
          canceled: 'CANCELLED',
          skipped: 'SKIPPED',
          running: 'RUNNING',
          pending: 'QUEUED',
          created: 'QUEUED',
          waiting_for_resource: 'QUEUED',
          preparing: 'QUEUED',
          scheduled: 'QUEUED',
        } as const
      )[status] ?? 'UNKNOWN'
    );
  }
}
