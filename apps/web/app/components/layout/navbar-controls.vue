<template>
  <ClientOnly>
    <UButton
      :aria-label="t(isDark ? 'layout.themeLight' : 'layout.themeDark')"
      color="neutral"
      :icon="isDark ? 'i-tabler-sun' : 'i-tabler-moon'"
      variant="ghost"
      @click="toggleTheme"
    />
  </ClientOnly>

  <UDropdownMenu :items="localeItems" :ui="{ content: 'w-40' }">
    <UButton
      :aria-label="t('layout.language')"
      class="gap-1.5"
      color="neutral"
      icon="i-tabler-language"
      variant="ghost"
    >
      <span class="hidden text-sm font-medium uppercase sm:inline">{{ locale }}</span>
    </UButton>
  </UDropdownMenu>

  <LayoutUserMenu />
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '#ui/types';

const colorMode = useColorMode();
const { locale, locales, setLocale, t } = useI18n();

const isDark = computed(() => colorMode.value === 'dark');
const localeItems = computed<DropdownMenuItem[]>(() =>
  locales.value.map((availableLocale) => ({
    checked: locale.value === availableLocale.code,
    label: availableLocale.name,
    onSelect: (event: Event) => {
      event.preventDefault();
      void setLocale(availableLocale.code);
    },
    type: 'checkbox',
  })),
);

/** Toggle the persisted Nuxt color-mode preference. */
function toggleTheme(): void {
  colorMode.preference = isDark.value ? 'light' : 'dark';
}
</script>
