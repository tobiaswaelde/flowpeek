import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useFlowpeekApi } from '~/composables/api/flowpeek-api';

/** Loads and updates personal interface preferences for the current authenticated session. */
export const useUserPreferencesStore = defineStore('user-preferences', () => {
  const dismissedIntroBannerIds = ref<string[]>([]);
  const error = ref(false);
  const initialized = ref(false);
  const loading = ref(false);
  let activeLoad: Promise<void> | undefined;
  let sessionGeneration = 0;

  /** Load the current user's preferences once, or force a server refresh. */
  async function load(force = false): Promise<void> {
    if (activeLoad) return activeLoad;
    if (initialized.value && !force) return;

    const generation = sessionGeneration;
    loading.value = true;
    error.value = false;
    const request = useFlowpeekApi()
      .userPreferences.get()
      .then((response) => {
        if (generation !== sessionGeneration) return;
        dismissedIntroBannerIds.value = response.data.dismissedIntroBannerIds;
        initialized.value = true;
      })
      .catch(() => {
        if (generation !== sessionGeneration) return;
        error.value = true;
      })
      .finally(() => {
        if (generation !== sessionGeneration || activeLoad !== request) return;
        loading.value = false;
        activeLoad = undefined;
      });
    activeLoad = request;
    return activeLoad;
  }

  /** Return whether the current user dismissed one stable page banner. */
  function isIntroBannerDismissed(bannerId: string): boolean {
    return dismissedIntroBannerIds.value.includes(bannerId);
  }

  /** Persist one dismissed page banner and update every mounted page immediately. */
  async function dismissIntroBanner(bannerId: string): Promise<void> {
    const generation = sessionGeneration;
    const response = await useFlowpeekApi().userPreferences.dismissIntroBanner(bannerId);
    if (generation !== sessionGeneration) return;
    dismissedIntroBannerIds.value = response.data.dismissedIntroBannerIds;
    initialized.value = true;
    error.value = false;
  }

  /** Restore all introductory page banners without changing other settings. */
  async function restoreIntroBanners(): Promise<void> {
    const generation = sessionGeneration;
    const response = await useFlowpeekApi().userPreferences.restoreIntroBanners();
    if (generation !== sessionGeneration) return;
    dismissedIntroBannerIds.value = response.data.dismissedIntroBannerIds;
    initialized.value = true;
    error.value = false;
  }

  /** Clear user-specific state when the authenticated session changes. */
  function reset(): void {
    sessionGeneration += 1;
    dismissedIntroBannerIds.value = [];
    error.value = false;
    initialized.value = false;
    loading.value = false;
    activeLoad = undefined;
  }

  return {
    dismissIntroBanner,
    dismissedIntroBannerIds,
    error,
    initialized,
    isIntroBannerDismissed,
    load,
    loading,
    reset,
    restoreIntroBanners,
  };
});
