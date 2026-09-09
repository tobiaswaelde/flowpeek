<template>
  <UDashboardGroup storage="local" storage-key="flowpeek" unit="rem">
    <a
      class="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-inverted focus:outline-none"
      href="#main-content"
    >
      {{ t('layout.skipToContent') }}
    </a>

    <LayoutSidebar />

    <div class="flex min-w-0 flex-1 flex-col">
      <UDashboardPanel id="main" class="min-h-0" :ui="{ body: 'overflow-y-auto p-0!' }">
        <template #header>
          <LayoutNavbar />
        </template>

        <template #body>
          <main
            id="main-content"
            tabindex="-1"
            :class="[
              'w-full',
              usesFullWidthContent ? 'flex min-h-full flex-1 flex-col' : 'mx-auto max-w-7xl p-4 sm:p-6 lg:p-8',
            ]"
          >
            <slot />
          </main>
        </template>
      </UDashboardPanel>

      <LayoutApiStatusBar />
    </div>
  </UDashboardGroup>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

import { useAuthStore } from '~/store/auth';
import { useSettingsStore } from '~/store/settings';
import { useUserPreferencesStore } from '~/store/user-preferences';

const { t } = useI18n();
const route = useRoute();
const usesFullWidthContent = computed(() => route.meta.fullWidth === true);
const auth = useAuthStore();
const settings = useSettingsStore();
const userPreferences = useUserPreferencesStore();

onMounted(() => {
  void settings.load();
  void userPreferences.load();
});

watch(
  () => auth.user?.id,
  (userId, previousUserId) => {
    if (userId === previousUserId) return;
    userPreferences.reset();
    if (userId) void userPreferences.load(true);
  },
);
</script>
