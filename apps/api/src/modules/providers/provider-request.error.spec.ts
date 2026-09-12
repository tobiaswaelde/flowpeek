import { ProviderRequestError, providerRequestError, providerRetryAt } from './provider-request.error.js';

describe('provider request errors', () => {
  const now = new Date('2026-09-12T10:00:00.000Z');

  it('prefers the later valid retry time from provider headers', () => {
    const headers = new Headers({
      'retry-after': '60',
      'x-ratelimit-reset': String(now.getTime() / 1000 + 120),
    });

    expect(providerRetryAt(headers, now)).toEqual(new Date('2026-09-12T10:02:00.000Z'));
  });

  it('accepts an HTTP-date retry-after value', () => {
    expect(providerRetryAt(new Headers({ 'retry-after': 'Sat, 12 Sep 2026 10:05:00 GMT' }), now)).toEqual(
      new Date('2026-09-12T10:05:00.000Z'),
    );
  });

  it('accepts standard delta-seconds rate-limit reset values', () => {
    expect(providerRetryAt(new Headers({ 'ratelimit-reset': '300' }), now)).toEqual(
      new Date('2026-09-12T10:05:00.000Z'),
    );
  });

  it('bounds provider delays and ignores malformed headers', () => {
    expect(providerRetryAt(new Headers({ 'retry-after': 'invalid' }), now)).toBeNull();
    expect(providerRetryAt(new Headers({ 'retry-after': String(48 * 60 * 60) }), now)).toEqual(
      new Date('2026-09-13T10:00:00.000Z'),
    );
  });

  it('creates a sanitized error without reading the response body', () => {
    const response = new Response('sensitive provider response', {
      headers: { 'retry-after': '30' },
      status: 429,
    });

    const error = providerRequestError('GitHub', response);

    expect(error).toBeInstanceOf(ProviderRequestError);
    expect(error.message).toBe('GitHub API request failed with status 429.');
    expect(error.retryAt).not.toBeNull();
    expect(error.message).not.toContain('sensitive');
  });

  it('recognizes an exhausted GitHub primary rate limit returned as 403', () => {
    const resetSeconds = Math.ceil(Date.now() / 1000) + 120;
    const error = providerRequestError(
      'GitHub',
      new Response(null, {
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(resetSeconds),
        },
        status: 403,
      }),
    );

    expect(error).toMatchObject({ rateLimited: true, retryAt: new Date(resetSeconds * 1000), status: 403 });
  });
});
