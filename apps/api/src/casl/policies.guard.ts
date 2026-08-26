import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedUser } from '../modules/auth/types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CaslAbilityFactory } from './casl-ability.factory.js';
import { CHECK_POLICIES_KEY, type PolicyHandler } from './check-policies.decorator.js';

interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}

/** Resolves memberships and enforces endpoint policies after JWT authentication. */
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly abilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlers = this.reflector.getAllAndOverride<PolicyHandler[]>(CHECK_POLICIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!handlers || handlers.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) return false;

    const memberships = await this.prisma.repositoryMembership.findMany({
      where: { userId: request.user.id },
      select: { repositoryId: true, role: true },
    });
    const ability = this.abilityFactory.createForUser(request.user, memberships);

    return handlers.every((handler) => handler(ability));
  }
}
