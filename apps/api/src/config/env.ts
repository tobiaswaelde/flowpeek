import { resolve } from 'node:path';

import dotenv from 'dotenv';

import { loadEnvironment } from './environment.js';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
  dotenv.config({
    path: resolve(process.cwd(), process.env.FLOWPEEK_ENV_FILE ?? '.env'),
    quiet: true,
    override: true,
  });
}

export const ENV = loadEnvironment(process.env);
