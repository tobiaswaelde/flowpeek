import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { ProviderCredentialService } from './provider-credential.service.js';

/** Admin-only persistence service for Flowpeek provider accounts. */
@Injectable()
export class ProviderAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: ProviderCredentialService,
  ) {}

  async list(user: AuthenticatedUser) {
    this.assertAdmin(user);
    return this.prisma.providerAccount.findMany({ orderBy: { displayName: 'asc' } });
  }
  /**
   * Persists a provider token received from a completed OAuth authorization.
   *
   * @param user The administrator that authorized the account.
   * @param input Provider account metadata and the returned OAuth token.
   * @returns The encrypted provider account record.
   */
  async createFromOAuth(
    user: AuthenticatedUser,
    input: {
      providerType: 'GITHUB' | 'GITLAB' | 'FORGEJO';
      displayName: string;
      baseUrl?: string;
      accessToken: string;
    },
  ) {
    return this.create(user, { ...input, enabled: true });
  }

  /**
   * Persists a provider account that uses a manually supplied personal access token.
   *
   * @param user The administrator adding the provider account.
   * @param input Provider account metadata and its write-only token.
   * @returns The encrypted provider account record.
   */
  async create(
    user: AuthenticatedUser,
    input: {
      providerType: 'GITHUB' | 'GITLAB' | 'FORGEJO';
      displayName: string;
      baseUrl?: string;
      enabled?: boolean;
      accessToken: string;
      webhookSecret?: string;
    },
  ) {
    this.assertAdmin(user);
    return this.prisma.providerAccount.create({
      data: {
        providerType: input.providerType,
        displayName: input.displayName,
        baseUrl: input.baseUrl ?? null,
        enabled: input.enabled ?? true,
        encryptedAccessToken: this.credentials.encrypt(input.accessToken),
        encryptedWebhookSecret: input.webhookSecret ? this.credentials.encrypt(input.webhookSecret) : null,
      },
    });
  }
  async update(
    user: AuthenticatedUser,
    id: string,
    input: {
      displayName?: string;
      baseUrl?: string | null;
      enabled?: boolean;
      accessToken?: string;
      webhookSecret?: string;
      clearWebhookSecret?: boolean;
    },
  ) {
    this.assertAdmin(user);
    await this.require(id);
    return this.prisma.providerAccount.update({
      where: { id },
      data: {
        displayName: input.displayName,
        baseUrl: input.baseUrl,
        enabled: input.enabled,
        encryptedAccessToken: input.accessToken ? this.credentials.encrypt(input.accessToken) : undefined,
        encryptedWebhookSecret: input.clearWebhookSecret
          ? null
          : input.webhookSecret
            ? this.credentials.encrypt(input.webhookSecret)
            : undefined,
      },
    });
  }
  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    this.assertAdmin(user);
    await this.require(id);
    await this.prisma.providerAccount.delete({ where: { id } });
  }
  /** Ensures that a request belongs to a system administrator. */
  assertAdmin(user: AuthenticatedUser): void {
    if (user.role !== 'SYSTEM_ADMIN') throw new ForbiddenException('System administrator access is required.');
  }
  private async require(id: string) {
    const account = await this.prisma.providerAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Provider account not found.');
    return account;
  }
}
