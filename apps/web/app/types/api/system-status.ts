import { z } from 'zod';

export const systemStatusEvent = 'system-status';

export const providerSyncActivitySchema = z.object({
  kind: z.literal('PROVIDER_SYNC'),
  phase: z.enum(['LOADING_REPOSITORIES', 'FETCHING_WORKFLOWS', 'PROCESSING_WORKFLOWS']),
  repositoriesCompleted: z.number().int().nonnegative(),
  repositoriesTotal: z.number().int().nonnegative(),
  workflowRunsCompleted: z.number().int().nonnegative().nullable(),
  workflowRunsTotal: z.number().int().nonnegative().nullable(),
});

export const systemStatusSnapshotSchema = z.object({
  activity: providerSyncActivitySchema.nullable(),
  runningWorkflowCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export type ProviderSyncActivity = z.infer<typeof providerSyncActivitySchema>;
export type SystemStatusSnapshot = z.infer<typeof systemStatusSnapshotSchema>;
