<script setup lang="ts">
import { useAuthStore } from '~/store/auth';

const auth = useAuthStore();
const { t } = useI18n();

/** End the current browser session and return to the sign-in view. */
async function signOut(): Promise<void> {
  await auth.signOut();
  await navigateTo('/auth/signin');
}
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <header class="border-b border-default bg-elevated/50">
      <div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div class="flex items-center gap-8">
          <NuxtLink class="text-lg font-semibold tracking-tight" to="/">Flowpeek</NuxtLink>
          <nav :aria-label="t('layout.primaryNavigation')" class="hidden items-center gap-2 sm:flex">
            <UButton :label="t('layout.dashboard')" color="neutral" to="/" variant="ghost" />
          </nav>
        </div>

        <div class="flex items-center gap-3">
          <div class="hidden text-right sm:block">
            <p class="text-sm font-medium">{{ auth.user?.username }}</p>
            <p class="text-xs text-muted">{{ t(`roles.${auth.user?.role ?? 'VIEWER'}`) }}</p>
          </div>
          <UButton
            :label="t('auth.signOut')"
            color="neutral"
            icon="i-lucide-log-out"
            variant="ghost"
            @click="signOut"
          />
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl px-6 py-8">
      <slot />
    </main>
  </div>
</template>
