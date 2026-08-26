const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockTransaction = jest.fn();
const mockPrismaPg = jest.fn();

jest.mock('../generated/prisma/client.js', () => ({
  PrismaClient: class {
    $connect = mockConnect;
    $disconnect = mockDisconnect;
    $transaction = mockTransaction;
  },
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class {
    constructor(options: unknown) {
      mockPrismaPg(options);
    }
  },
}));

jest.mock('../config/env.js', () => ({
  ENV: {
    DATABASE_URL: 'postgresql://flowpeek:flowpeek@localhost:5432/flowpeek_test',
  },
}));

import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a PostgreSQL adapter from the configured database URL', () => {
    new PrismaService();

    expect(mockPrismaPg).toHaveBeenCalledWith({
      connectionString: 'postgresql://flowpeek:flowpeek@localhost:5432/flowpeek_test',
    });
  });

  it('connects and disconnects with the Nest lifecycle', async () => {
    const service = new PrismaService();

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('executes a callback through an interactive transaction', async () => {
    const service = new PrismaService();
    const callback = jest.fn().mockResolvedValue('completed');
    mockTransaction.mockImplementation((transactionCallback) => transactionCallback({ id: 'transaction' }));

    await expect(service.transaction(callback)).resolves.toBe('completed');
    expect(callback).toHaveBeenCalledWith({ id: 'transaction' });
  });
});
