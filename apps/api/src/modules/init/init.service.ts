import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import bcrypt from 'bcrypt';

import { ENV } from '../../config/env.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Creates the configured initial administrator exactly once. */
@Injectable()
export class InitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InitService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({ where: { username: ENV.INITIAL_ADMIN_USERNAME } });
    if (existingUser) return;

    await this.prisma.user.create({
      data: {
        passwordHash: await bcrypt.hash(ENV.INITIAL_ADMIN_PASSWORD, 12),
        role: 'SYSTEM_ADMIN',
        username: ENV.INITIAL_ADMIN_USERNAME,
      },
    });
    this.logger.log(`Created initial administrator ${ENV.INITIAL_ADMIN_USERNAME}.`);
  }
}
