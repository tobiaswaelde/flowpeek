import type { DropdownMenuItem } from '#ui/types';
import { useMouse } from '@vueuse/core';

/** Supported persisted color-mode preferences. */
export type Theme = 'system' | 'light' | 'dark';
type ThemeItem = { label: string; value: Theme };

/** Provide the Tenant Web color-mode controls, including its view-transition effect. */
export const useThemes = () => {
  const { t } = useI18n();
  const colorMode = useColorMode();
  const { x: mouseX, y: mouseY } = useMouse();

  const themes = computed<ThemeItem[]>(() => [
    { label: t('layout.themeSystem'), value: 'system' },
    { label: t('layout.themeLight'), value: 'light' },
    { label: t('layout.themeDark'), value: 'dark' },
  ]);

  /** Apply a theme, revealing it from the pointer location when the browser supports view transitions. */
  const setTheme = (theme: Theme, x = mouseX.value, y = mouseY.value): void => {
    const applyTheme = () => {
      colorMode.preference = theme;
    };

    const startViewTransition = document.startViewTransition?.bind(document);
    if (!startViewTransition) {
      applyTheme();
      return;
    }

    document.documentElement.style.setProperty('--x', `${x}px`);
    document.documentElement.style.setProperty('--y', `${y}px`);
    startViewTransition(applyTheme);
  };

  const dropdownMenuItems = computed<DropdownMenuItem[]>(() =>
    themes.value.map((item) => ({
      checked: colorMode.preference === item.value,
      icon: `i-tabler-${item.value === 'system' ? 'device-desktop' : item.value === 'light' ? 'sun' : 'moon'}`,
      label: item.label as string,
      onUpdateChecked: () => setTheme(item.value as Theme),
      type: 'checkbox',
    })),
  );

  return {
    colorMode,
    dropdownMenuItems,
    setTheme,
    themes,
  };
};
