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
        update: jest.fn(),
      },
      workflowRun: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction = jest.fn().mockImplementation(async (callback) => callback(prisma));
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
    expect(prisma.workflowRun.groupBy).toHaveBeenNthCalledWith(1, {
      _sum: { durationMs: true },
      by: ['repositoryId'],
      where: {
        completedAt: { lt: new Date('2026-07-27T12:00:00.000Z') },
        repository: { workflowRunRetentionDays: null },
      },
    });
  });

  it('adds expired run durations to the matching repository before deletion', async () => {
    const prisma = {
      applicationSettings: { findUnique: jest.fn().mockResolvedValue({ workflowRunRetentionDays: 30 }) },
      repository: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      workflowRun: {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        groupBy: jest.fn().mockResolvedValue([
          { _sum: { durationMs: 120_000 }, repositoryId: 'repository-a' },
          { _sum: { durationMs: null }, repositoryId: 'repository-b' },
        ]),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction = jest.fn().mockImplementation(async (callback) => callback(prisma));

    await new WorkflowRunRetentionService(prisma as unknown as PrismaService, {} as JobRunnerService).deleteExpiredRuns(
      new Date('2026-08-26T12:00:00.000Z'),
    );

    expect(prisma.repository.update).toHaveBeenCalledWith({
      data: { retainedRunDurationMs: { increment: 120_000n } },
      where: { id: 'repository-a' },
    });
    expect(prisma.workflowRun.deleteMany).toHaveBeenCalledWith({
      where: {
        completedAt: { lt: new Date('2026-07-27T12:00:00.000Z') },
        repository: { workflowRunRetentionDays: null },
      },
    });
  });
});
