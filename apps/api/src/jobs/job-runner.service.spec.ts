import { isJobExecutionEnabled } from './job-runner.service.js';

describe('isJobExecutionEnabled', () => {
  it('disables jobs during tests even when scheduling is enabled', () => {
    expect(isJobExecutionEnabled({ SCHEDULER_ENABLED: true, isTest: true })).toBe(false);
  });

  it('requires explicit scheduler enablement outside tests', () => {
    expect(isJobExecutionEnabled({ SCHEDULER_ENABLED: false, isTest: false })).toBe(false);
    expect(isJobExecutionEnabled({ SCHEDULER_ENABLED: true, isTest: false })).toBe(true);
  });
});
