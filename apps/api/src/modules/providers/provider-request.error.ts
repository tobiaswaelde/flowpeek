/** Sanitized failure returned by a read-only provider HTTP endpoint. */
export class ProviderRequestError extends Error {
  constructor(
    provider: string,
    readonly status: number,
    readonly retryAt: Date | null,
    readonly rateLimited = status === 429,
  ) {
    super(`${provider} API request failed with status ${status}.`);
  }
}

const maximumProviderDelayMs = 24 * 60 * 60 * 1000;

/** Convert provider rate-limit response headers into a bounded retry time. */
export function providerRetryAt(headers: Headers, now = new Date()): Date | null {
  const retryAfter = parseRetryAfter(headers.get('retry-after'), now);
  const resetAt = parseResetAt(headers.get('ratelimit-reset') ?? headers.get('x-ratelimit-reset'), now);
  const candidate = [retryAfter, resetAt]
    .filter((value): value is Date => value !== null && value.getTime() > now.getTime())
    .sort((left, right) => right.getTime() - left.getTime())[0];
  if (!candidate) return null;
  return new Date(Math.min(Math.max(candidate.getTime(), now.getTime()), now.getTime() + maximumProviderDelayMs));
}

/** Create a provider request error without retaining response bodies or credentials. */
export function providerRequestError(provider: string, response: Response): ProviderRequestError {
  const rateLimited =
    response.status === 429 ||
    (response.status === 403 &&
      (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')));
  return new ProviderRequestError(provider, response.status, providerRetryAt(response.headers), rateLimited);
}

function parseRetryAfter(value: string | null, now: Date): Date | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return new Date(now.getTime() + seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function parseResetAt(value: string | null, now: Date): Date | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    const epochThreshold = now.getTime() / 1000 - 60;
    return seconds >= epochThreshold ? new Date(seconds * 1000) : new Date(now.getTime() + seconds * 1000);
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}
