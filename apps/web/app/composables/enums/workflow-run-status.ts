import type { BadgeProps } from '#ui/types';

import type { WorkflowRunStatus } from '~/types/api/resources';

/** Resolve the Nuxt UI color that represents a normalized workflow-run status. */
export function useWorkflowRunStatus(): {
  getColor: (status: WorkflowRunStatus) => BadgeProps['color'];
} {
  const getColor = (status: WorkflowRunStatus): BadgeProps['color'] => {
    if (status === 'SUCCESS') return 'success';
    if (status === 'FAILED') return 'error';
    if (status === 'RUNNING' || status === 'QUEUED') return 'info';
    if (status === 'CANCELLED' || status === 'SKIPPED') return 'warning';
    return 'neutral';
  };

  return { getColor };
}
