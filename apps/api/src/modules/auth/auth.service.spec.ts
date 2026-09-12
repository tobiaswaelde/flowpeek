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
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
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
      avatar: null,
      firstName: null,
      lastName: null,
      passwordHash: await bcrypt.hash('password', 4),
      role: 'VIEWER',
      username: 'viewer',
    });
    jwt.signAsync.mockResolvedValue('jwt');

    await expect(service.signIn('viewer', 'password')).resolves.toEqual({
      accessToken: 'jwt',
      user: {
        avatarUpdatedAt: null,
        firstName: null,
        id: 'user-id',
        lastName: null,
        role: 'VIEWER',
        username: 'viewer',
      },
    });
  });

  it('authenticates a valid access token against the current persisted user', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-id' });
    prisma.user.findUnique.mockResolvedValue({
      avatar: null,
      firstName: 'Mara',
      id: 'user-id',
      lastName: 'Manager',
      role: 'MANAGER',
      username: 'manager',
    });

    await expect(service.authenticateAccessToken('jwt')).resolves.toEqual({
      avatarUpdatedAt: null,
      firstName: 'Mara',
      id: 'user-id',
      lastName: 'Manager',
      role: 'MANAGER',
      username: 'manager',
    });
  });

  it('rejects an invalid access token', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('invalid token'));

    await expect(service.authenticateAccessToken('invalid')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('updates trimmed personal names without requiring a password', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-id', passwordHash: 'hash', username: 'viewer' });
    prisma.user.update.mockResolvedValue({
      avatar: null,
      firstName: 'Vera',
      id: 'user-id',
      lastName: null,
      role: 'VIEWER',
      username: 'viewer',
    });

    await expect(
      service.updateProfile('user-id', {
        firstName: ' Vera ',
        lastName: ' ',
        username: 'viewer',
      }),
    ).resolves.toEqual({
      avatarUpdatedAt: null,
      firstName: 'Vera',
      id: 'user-id',
      lastName: null,
      role: 'VIEWER',
      username: 'viewer',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { firstName: 'Vera', lastName: null, username: 'viewer' },
      include: { avatar: { select: { updatedAt: true } } },
    });
  });

  it('requires the current password before changing the login username', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-id', passwordHash: 'hash', username: 'viewer' });

    await expect(
      service.updateProfile('user-id', {
        firstName: null,
        lastName: null,
        username: 'renamed',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password before changing the login username', async () => {
    const passwordHash = await bcrypt.hash('current-password', 4);
    prisma.user.findUnique.mockResolvedValue({ id: 'user-id', passwordHash, username: 'viewer' });

    await expect(
      service.updateProfile('user-id', {
        currentPassword: 'incorrect-password',
        firstName: null,
        lastName: null,
        username: 'renamed',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('changes the login username after verifying the current password', async () => {
    const passwordHash = await bcrypt.hash('current-password', 4);
    prisma.user.findUnique.mockResolvedValue({ id: 'user-id', passwordHash, username: 'viewer' });
    prisma.user.update.mockResolvedValue({
      avatar: null,
      firstName: 'Vera',
      id: 'user-id',
      lastName: 'Viewer',
      role: 'VIEWER',
      username: 'renamed',
    });

    await expect(
      service.updateProfile('user-id', {
        currentPassword: 'current-password',
        firstName: 'Vera',
        lastName: 'Viewer',
        username: 'renamed',
      }),
    ).resolves.toMatchObject({ firstName: 'Vera', lastName: 'Viewer', username: 'renamed' });
  });
});
