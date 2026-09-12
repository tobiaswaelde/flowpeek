<template>
  <section class="flex min-h-0 min-w-0 flex-1 flex-col" data-page-shell>
    <UDashboardToolbar
      class="shrink-0 border-b border-default px-4 py-2"
      data-page-toolbar
      :ui="{ left: 'min-w-0 overflow-hidden', right: 'shrink-0' }"
    >
      <template #left>
        <UBreadcrumb :items="breadcrumbs" />
      </template>

      <template v-if="$slots.actions" #right>
        <slot name="actions" />
      </template>
    </UDashboardToolbar>

    <UDashboardToolbar v-if="$slots.navigation" data-page-navigation>
      <slot name="navigation" />
    </UDashboardToolbar>

    <UDashboardToolbar
      v-if="bannerVisible && !padded"
      class="shrink-0 border-b border-default px-4 py-2"
      data-page-introduction
      data-page-introduction-toolbar
      :data-intro-banner-id="bannerId"
      :ui="{ left: 'min-w-0', right: 'shrink-0' }"
    >
      <template #left>
        <div class="flex min-w-0 items-start gap-2">
          <UIcon class="mt-0.5 size-4 shrink-0 text-muted" :name="icon" />
          <div class="min-w-0">
            <h1 class="break-words text-sm font-semibold">{{ title }}</h1>
            <p class="break-words text-sm text-muted">{{ description }}</p>
          </div>
        </div>
      </template>
      <template #right>
        <UButton
          color="neutral"
          icon="i-lucide-x"
          size="xs"
          variant="ghost"
          :aria-label="t('pageIntro.dismiss', { title })"
          :loading="dismissing"
          @click="dismissBanner"
        />
      </template>
    </UDashboardToolbar>

    <div data-page-content :class="contentClasses">
      <div v-if="bannerVisible && padded" class="w-full min-w-0 shrink-0" data-page-introduction>
        <UAlert
          class="min-w-0 max-w-full"
          color="neutral"
          data-page-introduction-alert
          orientation="horizontal"
          variant="subtle"
          :data-intro-banner-id="bannerId"
          :description="description"
          :icon="icon"
        >
          <template #title>
            <h1 class="break-words text-lg font-semibold">{{ title }}</h1>
          </template>
          <template #actions>
            <UButton
              color="neutral"
              icon="i-lucide-x"
              size="xs"
              variant="ghost"
              :aria-label="t('pageIntro.dismiss', { title })"
              :loading="dismissing"
              @click="dismissBanner"
            />
          </template>
        </UAlert>
      </div>
      <h1 v-else-if="!bannerVisible" class="sr-only">{{ title }}</h1>

      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { useUserPreferencesStore } from '~/store/user-preferences';

interface PageBreadcrumbItem {
  icon?: string;
  label: string;
  to?: string;
}

const props = withDefaults(
  defineProps<{
    bannerId: string;
    breadcrumbs: PageBreadcrumbItem[];
    description: string;
    fullWidth?: boolean;
    icon?: string;
    padded?: boolean;
    title: string;
  }>(),
  { fullWidth: false, icon: 'i-lucide-info', padded: true },
);

const { t } = useI18n();
const toast = useToast();
const preferences = useUserPreferencesStore();
const dismissing = ref(false);
const bannerVisible = computed(() => !preferences.isIntroBannerDismissed(props.bannerId));
const contentClasses = computed(() => {
  if (!props.padded) return 'flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto';

  return [
    'min-h-0 w-full flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 lg:p-8',
    props.fullWidth ? undefined : 'mx-auto max-w-7xl',
  ];
});
/** Persist dismissal for this page while preserving the banner after a failed request. */
async function dismissBanner(): Promise<void> {
  if (dismissing.value) return;
  dismissing.value = true;
  try {
    await preferences.dismissIntroBanner(props.bannerId);
  } catch {
    toast.add({ color: 'error', title: t('pageIntro.dismissError') });
  } finally {
    dismissing.value = false;
  }
}
</script>
