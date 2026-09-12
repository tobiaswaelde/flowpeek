import type { JobRunnerService } from '../../jobs/job-runner.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { ProviderRequestError } from './provider-request.error.js';
import { ProviderSyncQueueService } from './sync-queue.service.js';
import type { ProviderSyncService } from './sync.service.js';

describe('ProviderSyncQueueService', () => {
  it('enqueues provider webhook references with a 15-second database debounce', async () => {
    const executeRaw = jest.fn().mockResolvedValue(1);
    const service = createService({
      $executeRaw: executeRaw,
      repository: { findFirst: jest.fn().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000001' }) },
    });

    await expect(service.enqueueWebhookRepository('account-id', '42')).resolves.toBe(true);

    const query = executeRaw.mock.calls[0]?.[0] as { values: unknown[] };
    const requestedAt = query.values[1] as Date;
    const runAfter = query.values[2] as Date;
    expect(runAfter.getTime() - requestedAt.getTime()).toBe(15_000);
  });

  it('enqueues direct repository requests without a delay', async () => {
    const executeRaw = jest.fn().mockResolvedValue(1);
    const service = createService({ $executeRaw: executeRaw });

    await service.enqueueRepositorySync('00000000-0000-0000-0000-000000000001');

    const query = executeRaw.mock.calls[0]?.[0] as { values: unknown[] };
    const requestedAt = query.values[1] as Date;
    const runAfter = query.values[2] as Date;
    expect(runAfter.getTime()).toBe(requestedAt.getTime());
  });

  it('atomically claims one account and removes a completed request', async () => {
    const mocks = processingMocks();
    const service = createService(mocks.prisma, mocks.sync);

    await service.processDueRequests();

    expect(mocks.sync.syncRepositoryById).toHaveBeenCalledWith(mocks.candidate.repositoryId);
    expect(mocks.transaction.repositorySyncRequest.delete).toHaveBeenCalledWith({
      where: { id: mocks.candidate.id },
    });
    expect(mocks.transaction.providerAccount.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ syncLeaseToken: null }) }),
    );
  });

  it('retains a follow-up request when another delivery arrives during synchronization', async () => {
    const mocks = processingMocks({ completedGeneration: 2 });
    const service = createService(mocks.prisma, mocks.sync);

    await service.processDueRequests();

    expect(mocks.transaction.repositorySyncRequest.delete).not.toHaveBeenCalled();
    expect(mocks.transaction.repositorySyncRequest.update).toHaveBeenCalledWith({
      data: expect.objectContaining({ attempt: 0, status: 'PENDING' }),
      where: { id: mocks.candidate.id },
    });
  });

  it('defers the repository and provider account to a supplied rate-limit reset', async () => {
    const retryAt = new Date(Date.now() + 10 * 60_000);
    const error = new ProviderRequestError('GitHub', 429, retryAt);
    const mocks = processingMocks({ error });
    const service = createService(mocks.prisma, mocks.sync);

    await service.processDueRequests();

    expect(mocks.transaction.repositorySyncRequest.update).toHaveBeenCalledWith({
      data: expect.objectContaining({ runAfter: retryAt, status: 'PENDING' }),
      where: { id: mocks.candidate.id },
    });
    expect(mocks.transaction.providerAccount.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rateLimitResetAt: retryAt }) }),
    );
  });
});

function createService(prisma: object, sync: object = { syncRepositoryById: jest.fn() }): ProviderSyncQueueService {
  return new ProviderSyncQueueService(
    prisma as PrismaService,
    { run: jest.fn((_name, callback) => callback()) } as unknown as JobRunnerService,
    sync as ProviderSyncService,
  );
}

function processingMocks(options: { completedGeneration?: number; error?: Error } = {}) {
  const candidate = {
    attempt: 0,
    createdAt: new Date(),
    generation: 1,
    id: '00000000-0000-0000-0000-000000000002',
    lastError: null,
    leaseExpiresAt: null,
    leaseToken: null,
    repository: { providerAccountId: '00000000-0000-0000-0000-000000000003' },
    repositoryId: '00000000-0000-0000-0000-000000000001',
    requestedAt: new Date(),
    runAfter: new Date(),
    status: 'PENDING',
    updatedAt: new Date(),
  } as const;
  let leaseToken: string | null = null;
  const transaction = {
    providerAccount: {
      updateMany: jest.fn(({ data }) => {
        if (data.syncLeaseToken) leaseToken = data.syncLeaseToken;
        return Promise.resolve({ count: 1 });
      }),
    },
    repositorySyncRequest: {
      delete: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn(() =>
        Promise.resolve({
          ...candidate,
          generation: options.completedGeneration ?? candidate.generation,
          leaseToken,
        }),
      ),
      update: jest.fn().mockResolvedValue(undefined),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    repositorySyncRequest: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValueOnce([candidate]).mockResolvedValueOnce([]),
    },
    transaction: jest.fn((callback) => callback(transaction)),
  };
  const sync = {
    syncRepositoryById: options.error ? jest.fn().mockRejectedValue(options.error) : jest.fn().mockResolvedValue(true),
  };
  return { candidate, prisma, sync, transaction };
}
