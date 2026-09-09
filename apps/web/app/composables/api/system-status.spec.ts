import { describe, expect, it } from 'vitest';

import { getSystemStatusProgress, getSystemStatusSocketUrl } from './system-status';

describe('system status helpers', () => {
  it('derives the status namespace from absolute and relative API base URLs', () => {
    expect(getSystemStatusSocketUrl('https://flowpeek.example/api/v1', 'https://web.example')).toBe(
      'https://flowpeek.example/status',
    );
    expect(getSystemStatusSocketUrl('/api/v1', 'https://flowpeek.example')).toBe('https://flowpeek.example/status');
  });

  it('uses workflow progress while processing and repository progress otherwise', () => {
    expect(
      getSystemStatusProgress({
        kind: 'PROVIDER_SYNC',
        phase: 'FETCHING_WORKFLOWS',
        repositoriesCompleted: 2,
        repositoriesTotal: 5,
        workflowRunsCompleted: null,
        workflowRunsTotal: null,
      }),
    ).toEqual({ current: 2, total: 5 });
    expect(
      getSystemStatusProgress({
        kind: 'PROVIDER_SYNC',
        phase: 'PROCESSING_WORKFLOWS',
        repositoriesCompleted: 2,
        repositoriesTotal: 5,
        workflowRunsCompleted: 7,
        workflowRunsTotal: 12,
      }),
    ).toEqual({ current: 7, total: 12 });
  });
});
