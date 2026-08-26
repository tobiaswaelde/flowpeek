import type { CleanedEnv, ReporterOptions } from 'envalid';
import { bool, cleanEnv, makeValidator, num, str } from 'envalid';

const base64Key = makeValidator<string>((input) => {
  const decoded = Buffer.from(input, 'base64');

  if (decoded.length !== 32 || decoded.toString('base64') !== input) {
    throw new Error('must be a canonical base64 value that decodes to exactly 32 bytes');
  }

  return input;
});

const httpUrl = makeValidator<string>((input) => {
  const url = new URL(input);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('must use the http or https protocol');
  }

  return input;
});

const positiveInteger = makeValidator<number>((input) => {
  const value = Number(input);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error('must be a positive integer');
  }

  return value;
});

const validators = {
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: num({ default: 3001 }),
  DATABASE_URL: str({ desc: 'PostgreSQL connection URL' }),
  SHADOW_DATABASE_URL: str({ desc: 'PostgreSQL shadow database URL for migrations' }),
  CORS_ORIGIN: str({ default: 'http://localhost:3000' }),
  PUBLIC_URL: httpUrl({ default: 'http://localhost:3000', desc: 'Public Flowpeek web URL' }),
  AUTH_JWT_ISSUER: str({ default: 'flowpeek' }),
  AUTH_JWT_SECRET: str({ desc: 'JWT signing secret' }),
  AUTH_JWT_EXPIRATION: str({ default: '7d' }),
  INITIAL_ADMIN_USERNAME: str({ default: 'admin' }),
  INITIAL_ADMIN_PASSWORD: str({ desc: 'Initial administrator password' }),
  TOKEN_ENCRYPTION_KEY: base64Key({ desc: 'Base64-encoded 32-byte encryption key' }),
  SCHEDULER_ENABLED: bool({ default: true }),
  SCHEDULER_SYNC_INTERVAL_SECONDS: positiveInteger({ default: 300 }),
  SMTP_HOST: str({ default: '' }),
  SMTP_PORT: positiveInteger({ default: 587 }),
  SMTP_SECURE: bool({ default: false }),
  SMTP_USERNAME: str({ default: '' }),
  SMTP_PASSWORD: str({ default: '' }),
  SMTP_FROM: str({ default: '' }),
};

/** The validated API runtime configuration. */
export type FlowpeekEnvironment = CleanedEnv<typeof validators>;

function throwOnInvalidEnvironment<T>({ errors }: ReporterOptions<T>): void {
  const messages = Object.entries(errors as Record<string, Error | undefined>).map(
    ([key, error]) => `${key}: ${error?.message ?? 'is invalid'}`,
  );

  if (messages.length > 0) {
    throw new Error(`Invalid Flowpeek environment configuration: ${messages.join(', ')}`);
  }
}

/**
 * Validate Flowpeek environment variables without logging their values.
 *
 * @param environment - Raw environment variables to validate.
 * @returns A read-only, typed configuration object.
 * @throws {Error} When required values are missing or cross-field validation fails.
 */
export function loadEnvironment(environment: NodeJS.ProcessEnv): FlowpeekEnvironment {
  const config = cleanEnv(environment, validators, { reporter: throwOnInvalidEnvironment });

  if (config.SMTP_HOST && !config.SMTP_FROM) {
    throw new Error('SMTP_FROM is required when SMTP_HOST is configured');
  }

  if (Boolean(config.SMTP_USERNAME) !== Boolean(config.SMTP_PASSWORD)) {
    throw new Error('SMTP_USERNAME and SMTP_PASSWORD must be configured together');
  }

  if (!config.SMTP_HOST && (config.SMTP_FROM || config.SMTP_USERNAME || config.SMTP_PASSWORD)) {
    throw new Error('SMTP_HOST is required when SMTP sender or credentials are configured');
  }

  return config;
}
