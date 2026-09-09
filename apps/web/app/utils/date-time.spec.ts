import { describe, expect, it } from 'vitest';

import { formatDateTimeValue } from './date-time';

describe('formatDateTimeValue', () => {
  const timestamp = '2026-09-09T13:05:00.000Z';

  it('formats the short localized option with a 24-hour clock', () => {
    expect(formatDateTimeValue(timestamp, 'LOCALE_SHORT', 'en-US', 'UTC')).toBe('9/9/26, 13:05');
  });

  it('formats the medium localized option with a 24-hour clock', () => {
    expect(formatDateTimeValue(timestamp, 'LOCALE_MEDIUM', 'en-US', 'UTC')).toBe('Sep 9, 2026, 13:05');
  });

  it('formats the stable ISO option with a 24-hour clock', () => {
    expect(formatDateTimeValue(timestamp, 'ISO', 'de-DE', 'UTC')).toBe('2026-09-09 13:05');
  });
});
