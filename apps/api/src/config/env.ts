import { resolve } from 'node:path';

import dotenv from 'dotenv';

import { loadEnvironment } from './environment.js';

dotenv.config({
  path: resolve(process.cwd(), process.env.FLOWPEEK_ENV_FILE ?? '.env'),
  quiet: true,
});

export const ENV = loadEnvironment(process.env);
