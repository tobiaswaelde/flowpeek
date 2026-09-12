import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

import { ENV } from '../../config/env.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthResult, AuthenticatedUser } from './types.js';

const avatarMetadata = { select: { updatedAt: true } } as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signIn(username: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { username }, include: { avatar: avatarMetadata } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      throw new UnauthorizedException('Invalid credentials.');
    const authenticatedUser = this.toAuthenticatedUser(user);
    return { accessToken: await this.createAccessToken(authenticatedUser), user: authenticatedUser };
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash)))
      throw new UnauthorizedException('Invalid credentials.');
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
  }

  /**
   * Validate a bearer token supplied during a non-HTTP transport handshake.
   *
   * @param accessToken - Encoded Flowpeek access token.
   * @returns The current persisted user represented by the token.
   * @throws UnauthorizedException when the token or referenced user is invalid.
   */
  async authenticateAccessToken(accessToken: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(accessToken, { issuer: ENV.AUTH_JWT_ISSUER });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { avatar: avatarMetadata },
      });
      if (!user) throw new UnauthorizedException();
      return this.toAuthenticatedUser(user);
    } catch {
      throw new UnauthorizedException();
    }
  }

  private createAccessToken(user: AuthenticatedUser): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, role: user.role, username: user.username });
  }

  private toAuthenticatedUser(user: {
    avatar: { updatedAt: Date } | null;
    id: string;
    role: AuthenticatedUser['role'];
    username: string;
  }): AuthenticatedUser {
    return { avatarUpdatedAt: user.avatar?.updatedAt ?? null, id: user.id, role: user.role, username: user.username };
  }
}
