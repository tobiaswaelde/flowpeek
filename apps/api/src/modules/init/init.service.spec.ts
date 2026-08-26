import { InitService } from './init.service.js';

describe('InitService', () => {
  const prisma = { user: { create: jest.fn(), findUnique: jest.fn() } };

  beforeEach(() => jest.clearAllMocks());

  it('does not overwrite an existing bootstrap administrator', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

    await new InitService(prisma as never).onApplicationBootstrap();

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates the configured bootstrap administrator when absent', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await new InitService(prisma as never).onApplicationBootstrap();

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'SYSTEM_ADMIN' }) }),
    );
  });
});
