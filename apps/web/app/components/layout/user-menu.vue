<template>
  <UDropdownMenu v-if="auth.user" :items="items" :ui="{ content: 'w-52' }">
    <UUser
      class="cursor-pointer"
      :avatar="{ text: initials }"
      :description="t(`roles.${auth.user.role}`)"
      :name="auth.user.username"
      :ui="{ name: 'truncate' }"
    />
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '#ui/types';

import { useAuthStore } from '~/store/auth';

const auth = useAuthStore();
const colorMode = useColorMode();
const { locale, locales, setLocale, t } = useI18n();

const initials = computed(() => auth.user?.username.slice(0, 2).toUpperCase());

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

const themeItems = computed<DropdownMenuItem[]>(() =>
  [
    { icon: 'i-lucide-monitor', label: t('layout.themeSystem'), value: 'system' },
    { icon: 'i-lucide-sun', label: t('layout.themeLight'), value: 'light' },
    { icon: 'i-lucide-moon', label: t('layout.themeDark'), value: 'dark' },
  ].map(({ icon, label, value }) => ({
    checked: colorMode.preference === value,
    icon,
    label,
    onSelect: (event: Event) => {
      event.preventDefault();
      colorMode.preference = value;
    },
    type: 'checkbox' as const,
  })),
);

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      children: localeItems.value,
      icon: 'i-lucide-languages',
      label: t('layout.language'),
    },
    {
      children: themeItems.value,
      icon: 'i-lucide-palette',
      label: t('layout.theme'),
    },
  ],
  [
    {
      color: 'error',
      icon: 'i-lucide-log-out',
      label: t('auth.signOut'),
      onSelect: () => {
        void signOut();
      },
    },
  ],
]);

/** End the browser session before returning to the public sign-in route. */
async function signOut(): Promise<void> {
  await auth.signOut();
  await navigateTo('/auth/signin');
}
</script>
