import { getWorkflowRunRetentionCutoff } from './workflow-run-retention.service.js';

describe('workflow run retention', () => {
  it('calculates cutoffs from whole-day retention policies', () => {
    expect(getWorkflowRunRetentionCutoff(7, new Date('2026-08-26T12:00:00.000Z'))).toEqual(
      new Date('2026-08-19T12:00:00.000Z'),
    );
  });

  it('rejects unsafe retention periods', () => {
    expect(() => getWorkflowRunRetentionCutoff(0, new Date())).toThrow(RangeError);
    expect(() => getWorkflowRunRetentionCutoff(1.5, new Date())).toThrow(RangeError);
  });
});
