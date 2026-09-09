/** Socket.IO event used to publish the current global API status. */
export const SYSTEM_STATUS_EVENT = 'system-status';

/** Detailed phase of a read-only provider workflow synchronization. */
export type ProviderSyncPhase = 'LOADING_REPOSITORIES' | 'FETCHING_WORKFLOWS' | 'PROCESSING_WORKFLOWS';

/** Safe aggregate progress for one provider synchronization without repository identifiers. */
export interface ProviderSyncActivity {
  kind: 'PROVIDER_SYNC';
  phase: ProviderSyncPhase;
  repositoriesCompleted: number;
  repositoriesTotal: number;
  workflowRunsCompleted: number | null;
  workflowRunsTotal: number | null;
}

/** Global operational state sent to authenticated Flowpeek clients. */
export interface SystemStatusSnapshot {
  activity: ProviderSyncActivity | null;
  runningWorkflowCount: number;
  updatedAt: string;
}

/** Complete update for an active provider synchronization. */
export type ProviderSyncActivityUpdate = Omit<ProviderSyncActivity, 'kind'>;
