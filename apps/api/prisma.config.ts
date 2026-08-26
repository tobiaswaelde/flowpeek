import { resolve } from 'node:path';

import dotenv from 'dotenv';
import { env, type PrismaConfig } from 'prisma/config';

dotenv.config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
dotenv.config({
  path: resolve(process.cwd(), process.env.FLOWPEEK_ENV_FILE ?? '.env'),
  quiet: true,
  override: true,
});

export default {
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
    shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
} satisfies PrismaConfig;
