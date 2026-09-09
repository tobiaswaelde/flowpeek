import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { UserPreferencesDto } from './dto/user-preferences.dto.js';

/** Reads and updates interface preferences belonging to the current authenticated user. */
@Injectable()
export class UserPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Return the current user's personal interface preferences. */
  async get(userId: string): Promise<UserPreferencesDto> {
    return this.prisma.user.findUniqueOrThrow({
      select: { dismissedIntroBannerIds: true },
      where: { id: userId },
    });
  }

  /** Idempotently record one dismissed introductory banner for the current user. */
  async dismissIntroBanner(userId: string, bannerId: string): Promise<UserPreferencesDto> {
    await this.prisma.user.updateMany({
      data: { dismissedIntroBannerIds: { push: bannerId } },
      where: { id: userId, NOT: { dismissedIntroBannerIds: { has: bannerId } } },
    });
    return this.get(userId);
  }

  /** Restore every introductory banner without changing unrelated user data. */
  async restoreIntroBanners(userId: string): Promise<UserPreferencesDto> {
    return this.prisma.user.update({
      data: { dismissedIntroBannerIds: { set: [] } },
      select: { dismissedIntroBannerIds: true },
      where: { id: userId },
    });
  }
}
