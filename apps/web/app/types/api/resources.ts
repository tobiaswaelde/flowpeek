import { z } from 'zod';

/** ISO-8601 timestamp returned by the Flowpeek HTTP API. */
export type ApiTimestamp = string;

/** Source forge type for a configured provider account. */
export const providerTypes = ['GITHUB', 'GITLAB', 'FORGEJO', 'GITEA'] as const;

/** Source forge type for a configured provider account. */
export type ProviderType = (typeof providerTypes)[number];

/** Validate the fields required for an OAuth provider authorization. */
export const providerOAuthFormSchema = z.object({
  displayName: z.string().trim().min(1).max(255),
  providerType: z.enum(providerTypes),
});

/** Validate the fields required for a personal-access-token provider account. */
export const providerPatFormSchema = providerOAuthFormSchema
  .extend({
    accessToken: z.string().min(1).max(4096),
    baseUrl: z.string().url().optional().or(z.literal('')),
  })
  .superRefine((provider, context) => {
    if (provider.providerType === 'GITEA' && !provider.baseUrl) {
      context.addIssue({ code: 'custom', message: 'A Gitea base URL is required.', path: ['baseUrl'] });
    }
  });

/** Safe configured provider account. Credentials are never returned by the API. */
export interface ProviderAccount {
  baseUrl: string | null;
  displayName: string;
  enabled: boolean;
  id: string;
  lastSyncAt: ApiTimestamp | null;
  providerType: ProviderType;
}

/** Input used to start a provider OAuth authorization. */
export interface StartProviderOAuth {
  displayName: string;
  providerType: ProviderType;
}

/** Write-only input for a provider account that uses a personal access token. */
export interface CreateProviderAccount {
  accessToken: string;
  baseUrl?: string;
  displayName: string;
  enabled?: boolean;
  providerType: ProviderType;
  webhookSecret?: string;
}

/** Browser destination returned when an OAuth authorization is started. */
export interface ProviderOAuthAuthorization {
  authorizationUrl: string;
}

/** Safe provider authentication capabilities for the current Flowpeek installation. */
export interface ProviderAuthenticationOptions {
  oauthProviderTypes: ProviderType[];
}

/** Write-only changes for an existing provider account. */
export interface UpdateProviderAccount {
  accessToken?: string;
  baseUrl?: string | null;
  clearWebhookSecret?: boolean;
  displayName?: string;
  enabled?: boolean;
  webhookSecret?: string;
}

/** Tracked repository and its retention settings. */
export interface Repository {
  enabled: boolean;
  id: string;
  name: string;
  owner: string;
  providerAccountId: string;
  url: string;
  workflowRunRetentionDays: number | null;
}

/** Safe system user representation. */
export interface User {
  id: string;
  username: string;
  role: 'SYSTEM_ADMIN' | 'VIEWER' | 'MANAGER';
  createdAt: ApiTimestamp;
  updatedAt: ApiTimestamp;
}

/** Normalized lifecycle status of a provider workflow run. */
export type WorkflowRunStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'SKIPPED' | 'UNKNOWN';

/** Safe provider identity included with dashboard data. */
export interface DashboardProvider {
  displayName: string;
  id: string;
  providerType: ProviderType;
}

/** Safe repository identity included with dashboard data. */
export interface DashboardRepository {
  id: string;
  name: string;
  owner: string;
  url: string;
}

/** Workflow run with dashboard-specific repository and provider context. */
export interface DashboardWorkflowRun {
  completedAt: ApiTimestamp | null;
  durationMs: number | null;
  id: string;
  provider: DashboardProvider;
  providerCreatedAt: ApiTimestamp;
  providerRunId: string;
  repository: DashboardRepository;
  startedAt: ApiTimestamp | null;
  status: WorkflowRunStatus;
  url: string;
  workflowName: string;
}

/** One bucket size supported by the dashboard workflow trend endpoint. */
export type TrendBucketSize = 'hour' | 'day' | 'week';

/** Parameters for a dashboard workflow trend query. */
export interface WorkflowRunTrendQuery {
  bucket?: TrendBucketSize;
  from: ApiTimestamp;
  to: ApiTimestamp;
}

/** Aggregated successful and failed workflow runs for one UTC interval. */
export interface WorkflowRunTrendBucket {
  bucketStart: ApiTimestamp;
  errorCount: number;
  successCount: number;
}

/** One permission-filtered workflow run returned by the resource query endpoint. */
export interface WorkflowRun {
  completedAt: ApiTimestamp | null;
  durationMs: number | null;
  id: string;
  providerCreatedAt: ApiTimestamp;
  providerRunId: string;
  repositoryId: string;
  startedAt: ApiTimestamp | null;
  status: WorkflowRunStatus;
  url: string;
  workflowName: string;
}

/** Supported notification transport type. */
export type NotificationChannelType = 'EMAIL' | 'GOTIFY' | 'NTFY';

/** Non-secret configuration for one repository notification channel. */
export type NotificationChannelConfiguration = Record<string, unknown>;

/** Safe repository-scoped notification channel. Secrets are never returned by the API. */
export interface NotificationChannel {
  configuration: NotificationChannelConfiguration;
  createdAt: ApiTimestamp;
  enabled: boolean;
  id: string;
  name: string;
  repositoryId: string;
  type: NotificationChannelType;
  updatedAt: ApiTimestamp;
}

/** Input for creating a repository notification channel. */
export interface CreateNotificationChannel {
  configuration?: NotificationChannelConfiguration;
  enabled?: boolean;
  name: string;
  repositoryId: string;
  secret?: string;
  type: NotificationChannelType;
}

/** Input for updating a repository notification channel. */
export interface UpdateNotificationChannel {
  clearSecret?: boolean;
  configuration?: NotificationChannelConfiguration;
  enabled?: boolean;
  name?: string;
  secret?: string;
}

/** Terminal workflow outcome that can match a notification rule. */
export type NotificationRuleOutcome = 'SUCCESS' | 'FAILED';

/** Repository-scoped workflow notification rule. */
export interface NotificationRule {
  channelIds: string[];
  createdAt: ApiTimestamp;
  enabled: boolean;
  id: string;
  outcome: NotificationRuleOutcome;
  repositoryId: string;
  updatedAt: ApiTimestamp;
  workflowPattern: string;
}

/** Input for creating a repository workflow notification rule. */
export interface CreateNotificationRule {
  channelIds: string[];
  enabled?: boolean;
  outcome: NotificationRuleOutcome;
  repositoryId: string;
  workflowPattern: string;
}

/** Input for updating a repository workflow notification rule. */
export interface UpdateNotificationRule {
  channelIds?: string[];
  enabled?: boolean;
  outcome?: NotificationRuleOutcome;
  workflowPattern?: string;
}

/** Current state of an idempotent notification delivery. */
export type NotificationDeliveryStatus = 'PENDING' | 'DELIVERED' | 'FAILED';

/** Safe metadata for one attempted notification transport delivery. */
export interface NotificationDeliveryAttempt {
  attempt: number;
  createdAt: ApiTimestamp;
  deliveredAt: ApiTimestamp | null;
  error: string | null;
  id: string;
  notificationChannelId: string;
}

/** Authorized notification delivery history including safe attempt metadata. */
export interface NotificationDelivery {
  attempts: NotificationDeliveryAttempt[];
  createdAt: ApiTimestamp;
  finalError: string | null;
  id: string;
  nextAttemptAt: ApiTimestamp | null;
  notificationRuleId: string;
  repositoryId: string;
  status: NotificationDeliveryStatus;
  updatedAt: ApiTimestamp;
  workflowRunId: string;
}

/** Last persisted synchronization status for one configured provider account. */
export interface ProviderAccountHealth {
  displayName: string;
  enabled: boolean;
  id: string;
  lastSyncAt: ApiTimestamp | null;
  providerType: ProviderType;
  syncStatus: 'disabled' | 'failed' | 'healthy' | 'unknown';
}

/** Process, database, and persisted provider health response. */
export interface HealthResponse {
  api: 'ok';
  database: 'error' | 'ok';
  providers: ProviderAccountHealth[];
  status: 'degraded' | 'ok';
}
