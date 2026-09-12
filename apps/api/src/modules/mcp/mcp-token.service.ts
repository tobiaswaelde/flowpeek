import { createHash, randomBytes } from 'node:crypto';

import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';

import type { McpAccessToken, User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types.js';
import {
  CreatedMcpAccessTokenDto,
  type CreateMcpAccessTokenDto,
  McpAccessTokenDto,
} from './dto/mcp-access-token.dto.js';

const tokenPrefix = 'ezrepo_mcp_';

/** Creates, validates, and revokes user-owned MCP bearer tokens. */
@Injectable()
export class McpTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /** List safe token metadata owned by the caller or a user selected by an administrator. */
  async list(requester: AuthenticatedUser, requestedUserId?: string): Promise<McpAccessTokenDto[]> {
    const userId = requestedUserId ?? requester.id;
    this.assertOwnerOrAdmin(requester, userId);
    const tokens = await this.prisma.mcpAccessToken.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      where: { userId },
    });
    return tokens.map((token) => McpAccessTokenDto.fromModel(token));
  }

  /** Create a high-entropy token owned by the authenticated caller and reveal it once. */
  async create(user: AuthenticatedUser, input: CreateMcpAccessTokenDto): Promise<CreatedMcpAccessTokenDto> {
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && expiresAt <= new Date()) throw new BadRequestException('Token expiration must be in the future.');

    const token = `${tokenPrefix}${randomBytes(32).toString('base64url')}`;
    const persisted = await this.prisma.mcpAccessToken.create({
      data: {
        expiresAt,
        name: input.name,
        tokenHash: this.hash(token),
        tokenPrefix: token.slice(0, 20),
        userId: user.id,
      },
    });
    return { ...McpAccessTokenDto.fromModel(persisted), token };
  }

  /** Revoke a token owned by the caller or selected by a system administrator. */
  async revoke(requester: AuthenticatedUser, id: string): Promise<void> {
    const token = await this.prisma.mcpAccessToken.findUnique({ where: { id } });
    if (!token) return;
    this.assertOwnerOrAdmin(requester, token.userId);
    if (!token.revokedAt) await this.prisma.mcpAccessToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  /** Authenticate an MCP bearer token and load the current persisted user. */
  async authenticate(
    token: string,
  ): Promise<{ expiresAt: Date | null; record: McpAccessToken; user: AuthenticatedUser }> {
    const record = await this.prisma.mcpAccessToken.findUnique({
      include: { user: true },
      where: { tokenHash: this.hash(token) },
    });
    if (
      !record ||
      !token.startsWith(tokenPrefix) ||
      record.revokedAt ||
      (record.expiresAt && record.expiresAt <= new Date())
    ) {
      throw new UnauthorizedException();
    }

    const updated = await this.prisma.mcpAccessToken.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });
    return {
      expiresAt: record.expiresAt,
      record: updated,
      user: this.toAuthenticatedUser(record.user),
    };
  }

  private assertOwnerOrAdmin(requester: AuthenticatedUser, userId: string): void {
    if (requester.id !== userId && requester.role !== 'SYSTEM_ADMIN') throw new ForbiddenException();
  }

  private hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return { id: user.id, role: user.role, username: user.username };
  }
}
