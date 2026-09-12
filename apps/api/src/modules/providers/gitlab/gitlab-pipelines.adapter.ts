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
  sha?: string;
  source?: string;
  merge_request?: { iid: number };
}
interface GitLabMergeRequest {
  merged_at?: string | null;
  state: string;
  target_branch?: string;
}

/** GitLab adapter that only reads projects and pipelines. */
@Injectable()
export class GitLabPipelinesAdapter implements ProviderAdapter {
  readonly providerType = 'GITLAB' as const;

  constructor(@Inject(PROVIDER_FETCH) private readonly fetchFn: FetchLike = fetch) {}

  async validateAccount(context: ProviderAccountContext): Promise<ProviderAccountValidation> {
    const user = await this.request<{ username: string }>(context, '/user');
    return { displayName: user.username, valid: true };
  }

  async listRepositories(context: ProviderAccountContext): Promise<ProviderRepository[]> {
    const projects = await this.request<GitLabProject[]>(context, '/projects?membership=true&simple=true&per_page=100');
    return projects.map((project) => this.toRepository(project));
  }

  async getChangeRequestState(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
    changeRequestNumber: string,
  ): Promise<ProviderChangeRequestState | null> {
    const response = await this.fetchFn(
      this.url(
        context,
        `/projects/${encodeURIComponent(repository.providerRepositoryId)}/merge_requests/${changeRequestNumber}`,
      ),
      { headers: this.headers(context) },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitLab API request failed with status ${response.status}.`);
    const mergeRequest = (await response.json()) as GitLabMergeRequest;
    const mergedAt = mergeRequest.merged_at ? new Date(mergeRequest.merged_at) : null;
    return {
      mergedAt,
      state:
        mergedAt || mergeRequest.state === 'merged' ? 'MERGED' : mergeRequest.state === 'closed' ? 'CLOSED' : 'OPEN',
      targetBranch: mergeRequest.target_branch ?? null,
    };
  }

  async getRepository(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
  ): Promise<ProviderRepository | null> {
    const response = await this.fetchFn(
      this.url(context, `/projects/${encodeURIComponent(repository.providerRepositoryId)}`),
      { headers: this.headers(context) },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitLab API request failed with status ${response.status}.`);
    return this.toRepository((await response.json()) as GitLabProject);
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
    if (typeof event !== 'string') return null;
    if (!this.hasValidWebhookSignature(request) && !this.hasValidLegacyToken(token, request.signingSecret)) return null;
    const payload = JSON.parse(Buffer.from(request.payload).toString('utf8')) as { project?: { id?: number } };
    return { event, providerRepositoryId: payload.project?.id ? String(payload.project.id) : null };
  }

  private hasValidLegacyToken(token: string | string[] | undefined, signingSecret: string): boolean {
    return (
      typeof token === 'string' &&
      token.length === signingSecret.length &&
      timingSafeEqual(Buffer.from(token), Buffer.from(signingSecret))
    );
  }
  private toRepository(project: GitLabProject): ProviderRepository {
    return {
      providerRepositoryId: String(project.id),
      owner: project.namespace.full_path,
      name: project.name,
      url: project.web_url,
    };
  }
  private hasValidWebhookSignature(request: ProviderWebhookRequest): boolean {
    const signature = request.headers['webhook-signature'];
    const id = request.headers['webhook-id'];
    const timestamp = request.headers['webhook-timestamp'];
    if (
      typeof signature !== 'string' ||
      typeof id !== 'string' ||
      typeof timestamp !== 'string' ||
      !request.signingSecret.startsWith('whsec_')
    ) {
      return false;
    }

    const key = Buffer.from(request.signingSecret.slice('whsec_'.length), 'base64');
    const expected = `v1,${createHmac('sha256', key)
      .update(`${id}.${timestamp}.${Buffer.from(request.payload).toString('utf8')}`)
      .digest('base64')}`;
    return signature.split(' ').some((candidate) => this.hasEqualValue(candidate, expected));
  }
  private hasEqualValue(value: string, expected: string): boolean {
    return value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
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
    const changeRequestNumber = this.gitLabMergeRequestNumber(pipeline)?.toString() ?? null;
    const headBranch = pipeline.ref ?? null;
    const workflowName = pipeline.name ?? 'Pipeline';
    return {
      awaitingApproval: isWorkflowRunAwaitingApproval('GITLAB', pipeline.status),
      changeRequestNumber,
      displayTitle: pipeline.name ?? pipeline.ref ?? 'Pipeline',
      event: pipeline.source ?? null,
      headBranch,
      headSha: pipeline.sha ?? null,
      providerRunId: String(pipeline.id),
      providerWorkflowId: pipeline.name ? `name:${pipeline.name}` : 'pipeline',
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
      status: normalizeWorkflowRunStatus('GITLAB', pipeline.status),
      rawStatus: pipeline.status,
      reviewUrl: this.gitLabMergeRequestUrl(pipeline),
      scopeKey: buildWorkflowRunScopeKey(changeRequestNumber, headBranch),
      workflowKind: 'STANDARD',
      workflowName,
      workflowPath: null,
    };
  }

  private gitLabMergeRequestUrl(pipeline: GitLabPipeline): string | null {
    const mergeRequestIid = this.gitLabMergeRequestNumber(pipeline);
    if (!mergeRequestIid) return null;
    return pipeline.web_url.replace(/\/-\/pipelines\/\d+(?:\/)?$/, `/-/merge_requests/${mergeRequestIid}`);
  }

  private gitLabMergeRequestNumber(pipeline: GitLabPipeline): number | null {
    const refMatch = pipeline.ref?.match(/^refs\/merge-requests\/(\d+)\/head$/);
    return pipeline.merge_request?.iid ?? (refMatch ? Number(refMatch[1]) : null);
  }
}
