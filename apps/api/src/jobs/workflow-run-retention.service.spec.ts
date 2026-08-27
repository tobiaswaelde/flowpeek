import type { PrismaService } from '../prisma/prisma.service.js';
import type { JobRunnerService } from './job-runner.service.js';
import { getWorkflowRunRetentionCutoff, WorkflowRunRetentionService } from './workflow-run-retention.service.js';

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

  it('resolves the global default separately from repository retention overrides', async () => {
    const prisma = {
      applicationSettings: { findUnique: jest.fn().mockResolvedValue({ workflowRunRetentionDays: 30 }) },
      repository: {
        findMany: jest.fn().mockResolvedValue([{ id: 'repository-override', workflowRunRetentionDays: 7 }]),
      },
      workflowRun: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const service = new WorkflowRunRetentionService(prisma as unknown as PrismaService, {} as JobRunnerService);
    const now = new Date('2026-08-26T12:00:00.000Z');

    await service.deleteExpiredRuns(now);

    expect(prisma.workflowRun.deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        completedAt: { lt: new Date('2026-07-27T12:00:00.000Z') },
        repository: { workflowRunRetentionDays: null },
      },
    });
    expect(prisma.workflowRun.deleteMany).toHaveBeenNthCalledWith(2, {
      where: {
        completedAt: { lt: new Date('2026-08-19T12:00:00.000Z') },
        repositoryId: 'repository-override',
      },
    });
  });
});
