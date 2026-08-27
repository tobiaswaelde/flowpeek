import { normalizeWorkflowRunStatus } from './workflow-status.js';

describe('normalizeWorkflowRunStatus', () => {
  it.each([
    ['GITHUB', 'completed', 'success', 'SUCCESS'],
    ['GITHUB', 'completed', 'failure', 'FAILED'],
    ['GITHUB', 'completed', 'skipped', 'SKIPPED'],
    ['GITLAB', 'running', null, 'RUNNING'],
    ['GITLAB', 'pending', null, 'QUEUED'],
    ['FORGEJO', 'in_progress', null, 'RUNNING'],
    ['FORGEJO', 'completed', 'cancelled', 'CANCELLED'],
    ['FORGEJO', 'completed', 'canceled', 'CANCELLED'],
    ['GITLAB', 'manual', null, 'QUEUED'],
    ['GITHUB', 'completed', 'neutral', 'UNKNOWN'],
  ] as const)('normalizes %s %s/%s to %s', (provider, lifecycle, conclusion, expected) => {
    expect(normalizeWorkflowRunStatus(provider, lifecycle, conclusion)).toBe(expected);
  });
});
