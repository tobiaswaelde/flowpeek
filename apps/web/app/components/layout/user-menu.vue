<template>
  <UDropdownMenu v-if="auth.user" :items="items" :ui="{ content: 'w-48' }">
    <UButton
      class="gap-2"
      color="neutral"
      icon="i-tabler-user-circle"
      variant="ghost"
      :disabled="signingOut"
      :loading="signingOut"
    >
      <span class="hidden text-sm sm:inline">{{ auth.user.username }}</span>
    </UButton>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '#ui/types';

import { useLocales } from '~/composables/app/locales';
import { useThemes } from '~/composables/app/themes';
import { useAuthStore } from '~/store/auth';

const auth = useAuthStore();
const signingOut = ref(false);

const { t } = useI18n();
const { dropdownMenuItems: localeItems } = useLocales();
const { dropdownMenuItems: themeItems } = useThemes();

const items = computed<DropdownMenuItem[]>(() => [
  {
    children: localeItems.value,
    icon: 'i-tabler-language',
    label: t('layout.language'),
  },
  {
    children: themeItems.value,
    icon: 'i-tabler-palette',
    label: t('layout.theme'),
  },
  { type: 'separator' },
  {
    color: 'error',
    icon: 'i-tabler-logout',
    label: t('auth.signOut'),
    onSelect: () => {
      void signOut();
    },
  },
]);

/** End the browser session before returning to the public sign-in route. */
async function signOut(): Promise<void> {
  if (signingOut.value) return;

  signingOut.value = true;
  try {
    await auth.signOut();
    await navigateTo('/auth/signin');
  } finally {
    signingOut.value = false;
  }
}
</script>

<style lang="css">
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-new(root) {
  z-index: 9999;
}

::view-transition-old(root) {
  z-index: 1;
}
</style>
