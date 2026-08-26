import type { ProviderType, WorkflowRunStatus } from '../../generated/prisma/client.js';

/** Normalize provider lifecycle and conclusion values without discarding the raw provider value. */
export function normalizeWorkflowRunStatus(
  provider: ProviderType,
  lifecycle: string,
  conclusion: string | null = null,
): WorkflowRunStatus {
  const state = lifecycle.toLowerCase();
  if (['in_progress', 'running'].includes(state)) return 'RUNNING';
  if (['queued', 'pending', 'created', 'waiting_for_resource', 'preparing', 'scheduled'].includes(state))
    return 'QUEUED';
  const normalized: Record<string, WorkflowRunStatus> = {
    success: 'SUCCESS',
    failure: 'FAILED',
    failed: 'FAILED',
    cancelled: 'CANCELLED',
    canceled: 'CANCELLED',
    skipped: 'SKIPPED',
  };
  return (
    normalized[(conclusion ?? lifecycle).toLowerCase()] ??
    (provider === 'GITLAB' && state === 'manual' ? 'QUEUED' : 'UNKNOWN')
  );
}
