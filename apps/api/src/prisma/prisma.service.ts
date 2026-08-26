import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { ENV } from '../config/env.js';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';

/** Injectable Prisma client with PostgreSQL adapter and transaction helpers. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy, OnModuleInit {
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: ENV.DATABASE_URL }),
    });
  }

  /** Connect the database client when Nest initializes the module. */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /** Disconnect the database client during graceful application shutdown. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Execute work inside an interactive database transaction.
   *
   * @param callback - Work that receives the transaction-scoped Prisma client.
   * @returns The value returned by the transaction callback.
   */
  async transaction<T>(callback: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(callback);
  }
}
