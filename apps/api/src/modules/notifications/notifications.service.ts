import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { CaslAbilityFactory } from '../../casl/casl-ability.factory.js';
import { CaslAction } from '../../casl/casl-action.js';
import { accessibleBy } from '../../casl/casl-prisma.js';
import { CaslSubject } from '../../casl/casl-subject.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types.js';
import type { CreateNotificationChannelDto, UpdateNotificationChannelDto } from './dto/notification-channel.dto.js';

/** Manages repository-scoped notification channel records without exposing secrets. */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: CaslAbilityFactory,
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
    return this.prisma.notificationChannel.create({
      data: {
        repositoryId: input.repositoryId,
        name: input.name.trim(),
        type: input.type,
        enabled: input.enabled ?? true,
        configuration: (input.configuration ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /** Update a channel after resolving its repository-scoped management access. */
  async updateChannel(user: AuthenticatedUser, id: string, input: UpdateNotificationChannelDto) {
    const channel = await this.findChannel(id);
    await this.assertCanManageRepository(user, channel.repositoryId);
    return this.prisma.notificationChannel.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.configuration === undefined ? {} : { configuration: input.configuration as Prisma.InputJsonValue }),
        ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
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
}
