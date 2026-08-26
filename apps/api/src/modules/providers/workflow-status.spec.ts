import { normalizeWorkflowRunStatus } from './workflow-status.js';

describe('normalizeWorkflowRunStatus', () => {
  it.each([
    ['GITHUB', 'completed', 'success', 'SUCCESS'],
    ['GITLAB', 'running', null, 'RUNNING'],
    ['FORGEJO', 'completed', 'cancelled', 'CANCELLED'],
    ['GITLAB', 'manual', null, 'QUEUED'],
    ['GITHUB', 'completed', 'neutral', 'UNKNOWN'],
  ] as const)('normalizes %s %s/%s to %s', (provider, lifecycle, conclusion, expected) => {
    expect(normalizeWorkflowRunStatus(provider, lifecycle, conclusion)).toBe(expected);
  });
});
