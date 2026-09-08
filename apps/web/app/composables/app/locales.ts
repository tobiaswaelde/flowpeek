import type { DropdownMenuItem } from '#ui/types';

/** Expose the configured interface locales in the format used by layout controls. */
export const useLocales = () => {
  const { locale, locales, setLocale } = useI18n();

  const availableLocales = computed(() => locales.value as Array<{ code: typeof locale.value; name: string }>);

  /** Persist and activate the selected interface locale. */
  const handleSelectLocale = async (code: typeof locale.value): Promise<void> => {
    await setLocale(code);
  };

  const dropdownMenuItems = computed<DropdownMenuItem[]>(() =>
    availableLocales.value.map(({ code, name }) => ({
      checked: locale.value === code,
      label: name,
      onSelect: (event: Event) => {
        event.preventDefault();
        void handleSelectLocale(code);
      },
      type: 'checkbox',
    })),
  );

  return {
    availableLocales,
    dropdownMenuItems,
    handleSelectLocale,
    locale,
  };
};
