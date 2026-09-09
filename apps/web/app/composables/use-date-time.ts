import { storeToRefs } from 'pinia';

import { useSettingsStore } from '~/store/settings';
import type { ApiTimestamp } from '~/types/api/resources';
import { formatDateTimeValue } from '~/utils/date-time';

/** Format API timestamps reactively with the configured global display policy. */
export function useDateTime() {
  const { locale } = useI18n();
  const { settings } = storeToRefs(useSettingsStore());

  return {
    formatDateTime: (timestamp: ApiTimestamp): string =>
      formatDateTimeValue(timestamp, settings.value.dateTimeFormat, locale.value),
  };
}
