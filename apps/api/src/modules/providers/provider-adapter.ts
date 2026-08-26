import type { ProviderType, WorkflowRunStatus } from '../../generated/prisma/client.js';

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

/** Provider workflow run normalized before persistence in Flowpeek. */
export interface ProviderWorkflowRun {
  completedAt: Date | null;
  durationMs: number | null;
  providerCreatedAt: Date;
  providerRunId: string;
  rawStatus: string | null;
  startedAt: Date | null;
  status: WorkflowRunStatus;
  url: string;
  workflowName: string;
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

/** Read-only webhook request data received by Flowpeek. */
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

  getWorkflowRun(
    context: ProviderAccountContext,
    providerRepositoryId: string,
    providerRunId: string,
  ): Promise<ProviderWorkflowRun | null>;
  listRepositories(context: ProviderAccountContext): Promise<ProviderRepository[]>;
  listWorkflowRuns(
    context: ProviderAccountContext,
    providerRepositoryId: string,
    updatedAfter?: Date,
  ): Promise<ProviderWorkflowRun[]>;
  validateAccount(context: ProviderAccountContext): Promise<ProviderAccountValidation>;
  verifyWebhook(request: ProviderWebhookRequest): Promise<VerifiedWebhook | null>;
}
