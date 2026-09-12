import { isWorkflowRunAwaitingApproval, normalizeWorkflowRunStatus } from './workflow-status.js';

describe('isWorkflowRunAwaitingApproval', () => {
  it.each([
    ['GITHUB', 'waiting', null, true],
    ['GITHUB', 'completed', 'action_required', true],
    ['GITLAB', 'manual', null, true],
    ['FORGEJO', 'queued', null, false],
  ] as const)('maps %s %s/%s to %s', (provider, lifecycle, conclusion, expected) => {
    expect(isWorkflowRunAwaitingApproval(provider, lifecycle, conclusion)).toBe(expected);
  });
});

describe('normalizeWorkflowRunStatus', () => {
  it.each([
    ['GITHUB', 'completed', 'success', 'SUCCESS'],
    ['GITHUB', 'completed', 'failure', 'FAILED'],
    ['GITHUB', 'completed', 'skipped', 'SKIPPED'],
    ['GITLAB', 'running', null, 'RUNNING'],
    ['GITLAB', 'pending', null, 'QUEUED'],
    ['FORGEJO', 'in_progress', null, 'RUNNING'],
    ['FORGEJO', 'blocked', null, 'QUEUED'],
    ['FORGEJO', 'requested', null, 'QUEUED'],
    ['FORGEJO', 'completed', 'cancelled', 'CANCELLED'],
    ['FORGEJO', 'completed', 'canceled', 'CANCELLED'],
    ['GITLAB', 'manual', null, 'QUEUED'],
    ['GITHUB', 'waiting', null, 'QUEUED'],
    ['GITHUB', 'completed', 'action_required', 'QUEUED'],
    ['GITHUB', 'completed', 'neutral', 'UNKNOWN'],
  ] as const)('normalizes %s %s/%s to %s', (provider, lifecycle, conclusion, expected) => {
    expect(normalizeWorkflowRunStatus(provider, lifecycle, conclusion)).toBe(expected);
  });
});
