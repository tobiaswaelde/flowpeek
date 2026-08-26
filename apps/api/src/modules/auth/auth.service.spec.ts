import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';

import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwt = { signAsync: jest.fn() };
  const service = new AuthService(prisma as never, jwt as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid local credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.signIn('unknown', 'password')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('issues a JWT for valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      passwordHash: await bcrypt.hash('password', 4),
      role: 'VIEWER',
      username: 'viewer',
    });
    jwt.signAsync.mockResolvedValue('jwt');

    await expect(service.signIn('viewer', 'password')).resolves.toEqual({
      accessToken: 'jwt',
      user: { id: 'user-id', role: 'VIEWER', username: 'viewer' },
    });
  });
});
