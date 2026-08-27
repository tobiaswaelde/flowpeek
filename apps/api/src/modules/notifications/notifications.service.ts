import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import picomatch from 'picomatch';

import { CaslAbilityFactory } from '../../casl/casl-ability.factory.js';
import { CaslAction } from '../../casl/casl-action.js';
import { accessibleBy } from '../../casl/casl-prisma.js';
import { CaslSubject } from '../../casl/casl-subject.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CredentialEncryptionService } from '../../security/credential-encryption.service.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { WorkflowFilterService } from '../repositories/workflow-filter.service.js';
import type { CreateNotificationChannelDto, UpdateNotificationChannelDto } from './dto/notification-channel.dto.js';
import type { CreateNotificationRuleDto, UpdateNotificationRuleDto } from './dto/notification-rule.dto.js';
import { NotificationDeliveryService } from './notification-delivery.service.js';

const notificationRuleInclude = {
  channelLinks: { select: { notificationChannelId: true } },
} satisfies Prisma.NotificationRuleInclude;

const notificationDeliveryHistoryInclude = {
  attempts: { orderBy: { createdAt: 'desc' } },
  notificationRule: { select: { repositoryId: true } },
} satisfies Prisma.NotificationDeliveryInclude;

/** Manages repository-scoped notification channel records without exposing secrets. */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abilityFactory: CaslAbilityFactory,
    private readonly credentials: CredentialEncryptionService,
    private readonly workflowFilters: WorkflowFilterService,
    private readonly deliveryService: NotificationDeliveryService,
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
    const url = this.prepareUrl(input.url);
    return this.prisma.notificationChannel.create({
      data: {
        repositoryId: input.repositoryId,
        name: input.name.trim(),
        enabled: input.enabled ?? true,
        encryptedUrl: this.credentials.encrypt(url.value),
        urlScheme: url.scheme,
        requiresReconfiguration: false,
      },
    });
  }

  /** Update a channel after resolving its repository-scoped management access. */
  async updateChannel(user: AuthenticatedUser, id: string, input: UpdateNotificationChannelDto) {
    const channel = await this.findChannel(id);
    await this.assertCanManageRepository(user, channel.repositoryId);
    const url = input.url === undefined ? undefined : this.prepareUrl(input.url);
    if (input.enabled && channel.requiresReconfiguration && url === undefined) {
      throw new ForbiddenException('Configure a replacement Apprise URL before enabling this channel.');
    }
    return this.prisma.notificationChannel.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(url === undefined
          ? {}
          : {
              encryptedUrl: this.credentials.encrypt(url.value),
              requiresReconfiguration: false,
              urlScheme: url.scheme,
            }),
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

  /** Return rules that belong to repositories visible to the current user. */
  async listRules(user: AuthenticatedUser, repositoryId?: string) {
    const ability = await this.getAbility(user);
    const accessibleWhere = accessibleBy(ability, CaslAction.Read).ofType(
      CaslSubject.NotificationRule as never,
    ) as Prisma.NotificationRuleWhereInput;
    return this.prisma.notificationRule.findMany({
      include: notificationRuleInclude,
      orderBy: [{ workflowPattern: 'asc' }, { id: 'asc' }],
      where: { AND: [accessibleWhere, ...(repositoryId ? [{ repositoryId }] : [])] },
    });
  }

  /** Create a repository rule with one or more channels from the same repository. */
  async createRule(user: AuthenticatedUser, input: CreateNotificationRuleDto) {
    await this.assertCanManageRepository(user, input.repositoryId);
    this.workflowFilters.validatePattern(input.workflowPattern);
    const channelIds = await this.assertChannelsBelongToRepository(input.channelIds, input.repositoryId);
    return this.prisma.notificationRule.create({
      data: {
        repositoryId: input.repositoryId,
        workflowPattern: input.workflowPattern.trim(),
        outcome: input.outcome,
        enabled: input.enabled ?? true,
        channelLinks: { createMany: { data: channelIds.map((notificationChannelId) => ({ notificationChannelId })) } },
      },
      include: notificationRuleInclude,
    });
  }

  /** Update a repository rule and, when supplied, atomically replace its channels. */
  async updateRule(user: AuthenticatedUser, id: string, input: UpdateNotificationRuleDto) {
    const rule = await this.findRule(id);
    await this.assertCanManageRepository(user, rule.repositoryId);
    if (input.workflowPattern !== undefined) this.workflowFilters.validatePattern(input.workflowPattern);
    const channelIds =
      input.channelIds === undefined
        ? undefined
        : await this.assertChannelsBelongToRepository(input.channelIds, rule.repositoryId);
    return this.prisma.notificationRule.update({
      where: { id },
      data: {
        ...(input.workflowPattern === undefined ? {} : { workflowPattern: input.workflowPattern.trim() }),
        ...(input.outcome === undefined ? {} : { outcome: input.outcome }),
        ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
        ...(channelIds === undefined
          ? {}
          : {
              channelLinks: {
                createMany: { data: channelIds.map((notificationChannelId) => ({ notificationChannelId })) },
                deleteMany: {},
              },
            }),
      },
      include: notificationRuleInclude,
    });
  }

  /** Delete a rule after resolving its repository-scoped management access. */
  async deleteRule(user: AuthenticatedUser, id: string): Promise<void> {
    const rule = await this.findRule(id);
    await this.assertCanManageRepository(user, rule.repositoryId);
    await this.prisma.notificationRule.delete({ where: { id } });
  }

  /** List delivery history limited to system administrators and repository managers. */
  async listDeliveryHistory(user: AuthenticatedUser, repositoryId?: string) {
    const managedRepositoryIds = await this.getManagedRepositoryIds(user);
    return this.prisma.notificationDelivery.findMany({
      include: notificationDeliveryHistoryInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      where: {
        notificationRule: {
          repositoryId:
            user.role === 'SYSTEM_ADMIN'
              ? repositoryId
                ? { equals: repositoryId }
                : undefined
              : { in: repositoryId ? managedRepositoryIds.filter((id) => id === repositoryId) : managedRepositoryIds },
        },
      },
    });
  }

  /**
   * Resolve enabled rules that match one persisted terminal run.
   *
   * Delivery creation intentionally remains separate so matching can be tested
   * independently and persisted idempotently by the delivery workflow.
   */
  async evaluateRulesForRun(run: {
    id: string;
    repositoryId: string;
    status: 'SUCCESS' | 'FAILED' | 'QUEUED' | 'RUNNING' | 'CANCELLED' | 'SKIPPED' | 'UNKNOWN';
    workflowName: string;
  }) {
    if (run.status !== 'SUCCESS' && run.status !== 'FAILED') return [];
    const rules = await this.prisma.notificationRule.findMany({
      include: notificationRuleInclude,
      where: { enabled: true, outcome: run.status, repositoryId: run.repositoryId },
    });
    const matchingRules = rules.filter((rule) =>
      picomatch.isMatch(run.workflowName, rule.workflowPattern, { bash: true }),
    );
    if (matchingRules.length > 0) {
      const created = await this.prisma.notificationDelivery.createMany({
        data: matchingRules.map((rule) => ({ notificationRuleId: rule.id, workflowRunId: run.id })),
        skipDuplicates: true,
      });
      if (created.count > 0) {
        const deliveries = await this.prisma.notificationDelivery.findMany({
          select: { id: true },
          where: { notificationRuleId: { in: matchingRules.map((rule) => rule.id) }, workflowRunId: run.id },
        });
        await this.deliveryService.deliverPending(deliveries.map((delivery) => delivery.id));
      }
    }
    return matchingRules;
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

  private async getManagedRepositoryIds(user: AuthenticatedUser): Promise<string[]> {
    if (user.role === 'SYSTEM_ADMIN') return [];
    if (user.role !== 'MANAGER') return [];
    const memberships = await this.prisma.repositoryMembership.findMany({
      where: { role: 'MANAGER', userId: user.id },
      select: { repositoryId: true },
    });
    return memberships.map((membership) => membership.repositoryId);
  }

  private async findChannel(id: string) {
    const channel = await this.prisma.notificationChannel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException('Notification channel not found.');
    return channel;
  }

  private async findRule(id: string) {
    const rule = await this.prisma.notificationRule.findUnique({ where: { id }, include: notificationRuleInclude });
    if (!rule) throw new NotFoundException('Notification rule not found.');
    return rule;
  }

  private async assertChannelsBelongToRepository(channelIds: string[], repositoryId: string): Promise<string[]> {
    const uniqueChannelIds = [...new Set(channelIds)];
    if (uniqueChannelIds.length !== channelIds.length) {
      throw new ForbiddenException('Notification channels must not be repeated in a rule.');
    }
    const channels = await this.prisma.notificationChannel.findMany({
      select: { id: true },
      where: { id: { in: uniqueChannelIds }, repositoryId },
    });
    if (channels.length !== uniqueChannelIds.length) {
      throw new ForbiddenException('Notification rules can only use channels from the same repository.');
    }
    return uniqueChannelIds;
  }

  private prepareUrl(value: string): { scheme: string; value: string } {
    const url = value.trim();
    if (!url || /\s/.test(url)) throw new ForbiddenException('An Apprise notification URL is required.');
    try {
      const parsed = new URL(url);
      const scheme = parsed.protocol.slice(0, -1).toLowerCase();
      if (scheme === 'file') throw new Error('file URLs are not notification destinations');
      return { scheme, value: url };
    } catch {
      throw new ForbiddenException('Provide a valid Apprise notification URL.');
    }
  }
}
