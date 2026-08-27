<template>
  <UDropdownMenu v-if="auth.user" :items="items" :ui="{ content: 'w-48' }">
    <UButton class="gap-2" color="neutral" icon="i-tabler-user-circle" variant="ghost">
      <span class="hidden text-sm sm:inline">{{ auth.user.username }}</span>
    </UButton>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '#ui/types';

import { useAuthStore } from '~/store/auth';

const auth = useAuthStore();

const { t } = useI18n();

const items = computed<DropdownMenuItem[]>(() => [
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
  await auth.signOut();
  await navigateTo('/auth/signin');
}
</script>
