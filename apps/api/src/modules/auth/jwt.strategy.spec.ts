import { UnauthorizedException } from '@nestjs/common';

import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const strategy = new JwtStrategy(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('accepts a legacy token while the user auth version remains zero', async () => {
    prisma.user.findUnique.mockResolvedValue({
      authVersion: 0,
      avatar: null,
      firstName: null,
      id: 'user-id',
      lastName: null,
      role: 'VIEWER',
      username: 'viewer',
    });

    await expect(strategy.validate({ sub: 'user-id' })).resolves.toMatchObject({ id: 'user-id' });
  });

  it('rejects a token with a stale auth version', async () => {
    prisma.user.findUnique.mockResolvedValue({ authVersion: 2 });

    await expect(strategy.validate({ authVersion: 1, sub: 'user-id' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
