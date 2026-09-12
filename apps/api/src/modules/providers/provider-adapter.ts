import type { ProviderType, WorkflowKind, WorkflowRunStatus } from '../../generated/prisma/client.js';

/** Injection token for the read-only HTTP client used by provider adapters. */
export const PROVIDER_FETCH = Symbol('PROVIDER_FETCH');

/** Credentials used only for read-only requests to a configured provider account. */
export interface ProviderAccountContext {
  accessToken: string;
  baseUrl: string | null;
  providerAccountId: string;
}

/** Repository returned by a provider's repository-discovery API. */
export interface ProviderRepository {
  name: string;
  owner: string;
  providerRepositoryId: string;
  url: string;
}

/** Repository identity retained by ezRepo for provider run requests. */
export interface ProviderRepositoryReference {
  name: string;
  owner: string;
  providerRepositoryId: string;
}

/** Read-only lifecycle metadata used to retire obsolete change-request workflow failures. */
export interface ProviderChangeRequestState {
  mergedAt: Date | null;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  targetBranch: string | null;
}

/** Provider workflow run normalized before persistence in ezRepo. */
export interface ProviderWorkflowRun {
  awaitingApproval: boolean;
  changeRequestNumber: string | null;
  completedAt: Date | null;
  displayTitle: string;
  durationMs: number | null;
  event: string | null;
  headBranch: string | null;
  headSha: string | null;
  providerCreatedAt: Date;
  providerRunId: string;
  providerWorkflowId: string;
  rawStatus: string | null;
  reviewUrl: string | null;
  scopeKey: string;
  startedAt: Date | null;
  status: WorkflowRunStatus;
  url: string;
  workflowKind: WorkflowKind;
  workflowName: string;
  workflowPath: string | null;
}

/** Build the stable execution context used to decide whether a workflow is currently failing. */
export function buildWorkflowRunScopeKey(changeRequestNumber: string | null, headBranch: string | null): string {
  if (changeRequestNumber) return `change-request:${changeRequestNumber}`;
  if (headBranch) return `branch:${headBranch}`;
  return 'repository';
}

/** Result of validating a provider account without mutating provider state. */
export interface ProviderAccountValidation {
  displayName: string;
  valid: boolean;
}

/** Verified provider webhook details safe to hand to synchronization code. */
export interface VerifiedWebhook {
  event: string;
  providerRepositoryId: string | null;
}

/** Read-only webhook request data received by ezRepo. */
export interface ProviderWebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  payload: Uint8Array;
  signingSecret: string;
}

/**
 * Contract every provider adapter must implement.
 *
 * This deliberately permits only validation, discovery, synchronization reads,
 * and webhook verification. It contains no operation that can alter provider
 * accounts, repositories, workflows, or provider webhook registrations.
 */
export interface ProviderAdapter {
  readonly providerType: ProviderType;

  getChangeRequestState(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
    changeRequestNumber: string,
  ): Promise<ProviderChangeRequestState | null>;
  getRepository(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
  ): Promise<ProviderRepository | null>;
  getWorkflowRun(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
    providerRunId: string,
  ): Promise<ProviderWorkflowRun | null>;
  listRepositories(context: ProviderAccountContext): Promise<ProviderRepository[]>;
  listWorkflowRuns(
    context: ProviderAccountContext,
    repository: ProviderRepositoryReference,
    updatedAfter?: Date,
  ): Promise<ProviderWorkflowRun[]>;
  validateAccount(context: ProviderAccountContext): Promise<ProviderAccountValidation>;
  verifyWebhook(request: ProviderWebhookRequest): Promise<VerifiedWebhook | null>;
}
