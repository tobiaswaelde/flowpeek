import { ProviderRequestError } from './provider-request.error.js';

export const maximumProviderSyncAttempts = 5;

export interface ProviderRetryDecision {
  retry: boolean;
  runAfter: Date | null;
  rateLimitedUntil: Date | null;
}

/** Determine whether and when a failed provider synchronization may be retried. */
export function providerRetryDecision(
  error: unknown,
  attempt: number,
  now = new Date(),
  random: () => number = Math.random,
): ProviderRetryDecision {
  if (error instanceof ProviderRequestError) {
    if (error.rateLimited) {
      const runAfter = error.retryAt ?? jitteredDelay(now, 60_000, attempt, 15 * 60_000, random);
      return {
        rateLimitedUntil: runAfter,
        retry: attempt < maximumProviderSyncAttempts,
        runAfter: attempt < maximumProviderSyncAttempts ? runAfter : null,
      };
    }
    if (attempt >= maximumProviderSyncAttempts) return { rateLimitedUntil: null, retry: false, runAfter: null };
    if (![408, 425, 500, 502, 503, 504].includes(error.status))
      return { rateLimitedUntil: null, retry: false, runAfter: null };
  } else if (!(error instanceof TypeError)) {
    return { rateLimitedUntil: null, retry: false, runAfter: null };
  } else if (attempt >= maximumProviderSyncAttempts) {
    return { rateLimitedUntil: null, retry: false, runAfter: null };
  }

  return {
    rateLimitedUntil: null,
    retry: true,
    runAfter: jitteredDelay(now, 1_000, attempt, 60_000, random),
  };
}

function jitteredDelay(now: Date, baseMs: number, attempt: number, maximumMs: number, random: () => number): Date {
  const exponentialMs = Math.min(baseMs * 2 ** Math.max(attempt - 1, 0), maximumMs);
  const jitterMs = Math.floor(exponentialMs * 0.2 * Math.min(Math.max(random(), 0), 1));
  return new Date(now.getTime() + Math.min(exponentialMs + jitterMs, maximumMs));
}
