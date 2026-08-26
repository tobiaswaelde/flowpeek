import { BadRequestException } from '@nestjs/common';

import { WorkflowFilterService } from './workflow-filter.service.js';

describe('WorkflowFilterService', () => {
  const service = new WorkflowFilterService();

  it('includes every workflow when no allow list exists', () => {
    expect(service.shouldTrack('Build and test', [])).toBe(true);
  });

  it('requires an allow-list match when allow rules are configured', () => {
    expect(service.shouldTrack('Build and test', [{ mode: 'ALLOW', pattern: 'Build*' }])).toBe(true);
    expect(service.shouldTrack('Release', [{ mode: 'ALLOW', pattern: 'Build*' }])).toBe(false);
  });

  it('always evaluates deny rules before allow rules', () => {
    expect(
      service.shouldTrack('Deploy production', [
        { mode: 'ALLOW', pattern: 'Deploy*' },
        { mode: 'DENY', pattern: '*production' },
      ]),
    ).toBe(false);
  });

  it('rejects empty patterns', () => {
    expect(() => service.validatePattern('  ')).toThrow(BadRequestException);
  });
});
