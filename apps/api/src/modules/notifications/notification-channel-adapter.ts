import type { NotificationChannel, ProviderType, WorkflowRunStatus } from '../../generated/prisma/client.js';

/** Provider and workflow context included in every outbound notification. */
export interface NotificationPayload {
  completedAt: Date | null;
  durationMs: number | null;
  provider: ProviderType;
  repository: string;
  runUrl: string;
  status: WorkflowRunStatus;
  workflowName: string;
}

/** A read-only configured Apprise notification destination. */
export interface NotificationChannelAdapter {
  /** Send one structured workflow notification through its configured channel. */
  send(channel: NotificationChannel, payload: NotificationPayload): Promise<void>;
}

/** Render the stable human-readable body shared by every notification transport. */
export function formatNotificationMessage(payload: NotificationPayload): string {
  const duration = payload.durationMs === null ? 'unknown' : `${Math.round(payload.durationMs / 1000)} seconds`;
  const completedAt = payload.completedAt?.toISOString() ?? 'not completed';
  return [
    `Provider: ${payload.provider}`,
    `Repository: ${payload.repository}`,
    `Workflow: ${payload.workflowName}`,
    `Status: ${payload.status}`,
    `Duration: ${duration}`,
    `Completed: ${completedAt}`,
    `Run: ${payload.runUrl}`,
  ].join('\n');
}
