import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const localeCodes = ['de', 'es', 'fr', 'it', 'nl', 'pl', 'pt'] as const;

/** Return all dot-separated leaf paths in a locale message tree. */
function messageKeys(messages: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? messageKeys(value as Record<string, unknown>, `${prefix}${key}.`)
      : `${prefix}${key}`,
  );
}

/** Read a JSON locale file from the checked-in translation source. */
function loadLocale(localeCode: string): Record<string, unknown> {
  return JSON.parse(readFileSync(new URL(`../../i18n/locales/${localeCode}.json`, import.meta.url), 'utf8')) as Record<
    string,
    unknown
  >;
}

describe('locale messages', () => {
  it('keeps every shipped locale complete relative to English fallback messages', () => {
    const englishKeys = messageKeys(loadLocale('en')).sort();

    for (const localeCode of localeCodes) {
      expect(messageKeys(loadLocale(localeCode)).sort(), localeCode).toEqual(englishKeys);
    }
  });
});
