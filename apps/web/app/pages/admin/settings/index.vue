<template>
  <div class="space-y-6">
    <ModulesSettingsProfileCard />
    <ModulesSettingsAvatarCard />

    <UCard :ui="{ body: 'space-y-4' }">
      <template #header>
        <div>
          <h2 class="font-semibold">{{ $t('settings.pageIntroductions') }}</h2>
          <p class="text-sm text-muted">{{ $t('settings.pageIntroductionsDescription') }}</p>
        </div>
      </template>

      <UAlert
        v-if="restoreError"
        color="error"
        icon="i-lucide-circle-alert"
        variant="subtle"
        :title="$t('settings.restoreBannersError')"
      />
      <UAlert
        v-else-if="restored"
        color="success"
        icon="i-lucide-circle-check"
        variant="subtle"
        :title="$t('settings.bannersRestored')"
      />

      <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="text-sm text-muted">
          {{ $t('settings.dismissedBanners', { count: userPreferences.dismissedIntroBannerIds.length }) }}
        </p>
        <UButton
          color="neutral"
          icon="i-lucide-rotate-ccw"
          variant="soft"
          :disabled="userPreferences.dismissedIntroBannerIds.length === 0"
          :label="$t('settings.restoreBanners')"
          :loading="restoring"
          @click="restoreBanners"
        />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { useUserPreferencesStore } from '~/store/user-preferences';

const userPreferences = useUserPreferencesStore();
const restoreError = ref(false);
const restored = ref(false);
const restoring = ref(false);

/** Restore every dismissed introductory banner for only the current authenticated user. */
async function restoreBanners(): Promise<void> {
  restoring.value = true;
  restoreError.value = false;
  restored.value = false;
  try {
    await userPreferences.restoreIntroBanners();
    restored.value = true;
  } catch {
    restoreError.value = true;
  } finally {
    restoring.value = false;
  }
}
</script>
