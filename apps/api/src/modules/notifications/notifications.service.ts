import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isEmail } from 'class-validator';

import { CaslAbilityFactory } from '../../casl/casl-ability.factory.js';
import { CaslAction } from '../../casl/casl-action.js';
import { accessibleBy } from '../../casl/casl-prisma.js';
import { CaslSubject } from '../../casl/casl-subject.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { ProviderCredentialService } from '../providers/provider-credential.service.js';
import type { CreateNotificationChannelDto, UpdateNotificationChannelDto } from './dto/notification-channel.dto.js';

/** Manages repository-scoped notification channel records without exposing secrets. */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: CaslAbilityFactory,
    private readonly credentials: ProviderCredentialService,
  ) {}

  /** Return channels that belong to repositories visible to the current user. */
  async listChannels(user: AuthenticatedUser, repositoryId?: string) {
    const ability = await this.getAbility(user);
    const accessibleWhere = accessibleBy(ability, CaslAction.Read).ofType(
      CaslSubject.NotificationChannel as never,
    ) as Prisma.NotificationChannelWhereInput;
    return this.prisma.notificationChannel.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      where: {
        AND: [accessibleWhere, ...(repositoryId ? [{ repositoryId }] : [])],
      },
    });
  }

  /** Create one channel for a repository the caller can manage. */
  async createChannel(user: AuthenticatedUser, input: CreateNotificationChannelDto) {
    await this.assertCanManageRepository(user, input.repositoryId);
    const configuration = this.validateConfiguration(input.type, input.configuration);
    const encryptedSecret = this.encryptSecret(input.type, input.secret);
    return this.prisma.notificationChannel.create({
      data: {
        repositoryId: input.repositoryId,
        name: input.name.trim(),
        type: input.type,
        enabled: input.enabled ?? true,
        configuration,
        encryptedSecret,
      },
    });
  }

  /** Update a channel after resolving its repository-scoped management access. */
  async updateChannel(user: AuthenticatedUser, id: string, input: UpdateNotificationChannelDto) {
    const channel = await this.findChannel(id);
    await this.assertCanManageRepository(user, channel.repositoryId);
    const configuration =
      input.configuration === undefined ? undefined : this.validateConfiguration(channel.type, input.configuration);
    const encryptedSecret = input.clearSecret ? null : this.encryptSecret(channel.type, input.secret);
    return this.prisma.notificationChannel.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(configuration === undefined ? {} : { configuration }),
        ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
        ...(encryptedSecret === undefined ? {} : { encryptedSecret }),
      },
    });
  }

  /** Delete a channel after resolving its repository-scoped management access. */
  async deleteChannel(user: AuthenticatedUser, id: string): Promise<void> {
    const channel = await this.findChannel(id);
    await this.assertCanManageRepository(user, channel.repositoryId);
    await this.prisma.notificationChannel.delete({ where: { id } });
  }

  private async getAbility(user: AuthenticatedUser) {
    const memberships = await this.prisma.repositoryMembership.findMany({
      where: { userId: user.id },
      select: { repositoryId: true, role: true },
    });
    return this.abilityFactory.createForUser(user, memberships);
  }

  private async assertCanManageRepository(user: AuthenticatedUser, repositoryId: string): Promise<void> {
    if (user.role === 'SYSTEM_ADMIN') return;
    if (user.role !== 'MANAGER') throw new ForbiddenException('Repository manager access is required.');

    const membership = await this.prisma.repositoryMembership.findUnique({
      where: { userId_repositoryId: { repositoryId, userId: user.id } },
      select: { role: true },
    });
    if (membership?.role !== 'MANAGER') throw new ForbiddenException('Repository manager access is required.');
  }

  private async findChannel(id: string) {
    const channel = await this.prisma.notificationChannel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException('Notification channel not found.');
    return channel;
  }

  private encryptSecret(type: 'EMAIL' | 'GOTIFY' | 'NTFY', secret: string | undefined): string | undefined {
    if (secret === undefined) return undefined;
    if (type === 'EMAIL') throw new ForbiddenException('Email channels use global SMTP credentials.');
    if (!secret.trim()) throw new ForbiddenException('Notification channel credentials must not be empty.');
    return this.credentials.encrypt(secret);
  }

  private validateConfiguration(
    type: 'EMAIL' | 'GOTIFY' | 'NTFY',
    configuration: Record<string, unknown> | undefined,
  ): Prisma.InputJsonValue {
    const value = configuration ?? {};
    if (type === 'EMAIL') {
      const recipients = value.recipients;
      if (
        !Array.isArray(recipients) ||
        recipients.length === 0 ||
        !recipients.every((recipient) => typeof recipient === 'string' && isEmail(recipient))
      ) {
        throw new ForbiddenException('Email channels require at least one valid recipient address.');
      }
      return { recipients };
    }

    const serverUrl = value.serverUrl;
    if (typeof serverUrl !== 'string' || !this.isHttpUrl(serverUrl)) {
      throw new ForbiddenException('Gotify and ntfy channels require an HTTP or HTTPS server URL.');
    }
    if (type === 'GOTIFY') return { serverUrl };

    const topic = value.topic;
    if (typeof topic !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(topic)) {
      throw new ForbiddenException('ntfy channels require a topic using letters, numbers, underscores, or hyphens.');
    }
    return { serverUrl, topic };
  }

  private isHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
