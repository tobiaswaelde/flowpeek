import type { ValidationPipeOptions } from '@nestjs/common';

/** Nest validation settings used for every request DTO. */
export const validationOptions: ValidationPipeOptions = {
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
  validationError: { target: false, value: false },
  whitelist: true,
};

/**
 * Convert the CORS environment value into Nest's allowed-origin setting.
 *
 * @param corsOrigin - A comma-separated list of origins, or `*`.
 * @returns Explicit allowed origins or true for an intentional wildcard.
 */
export function getCorsOrigins(corsOrigin: string): true | string[] {
  if (corsOrigin.trim() === '*') {
    return true;
  }

  return corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
