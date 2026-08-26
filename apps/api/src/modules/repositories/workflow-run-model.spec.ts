import { Prisma, WorkflowRunStatus } from '../../generated/prisma/client.js';

describe('Workflow run model', () => {
  it('records the normalized lifecycle states used by provider adapters', () => {
    expect(Object.values(WorkflowRunStatus)).toEqual([
      'QUEUED',
      'RUNNING',
      'SUCCESS',
      'FAILED',
      'CANCELLED',
      'SKIPPED',
      'UNKNOWN',
    ]);
  });

  it('exposes the workflow run model to Prisma consumers', () => {
    expect(Prisma.ModelName.WorkflowRun).toBe('WorkflowRun');
  });
});
