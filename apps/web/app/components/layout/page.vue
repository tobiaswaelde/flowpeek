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

    <div :class="contentClasses">
      <div v-if="bannerVisible" :class="bannerContainerClasses" data-page-introduction>
        <UAlert
          class="min-w-0 max-w-full"
          color="neutral"
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
      <h1 v-else class="sr-only">{{ title }}</h1>

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
    icon?: string;
    padded?: boolean;
    title: string;
  }>(),
  { icon: 'i-lucide-info', padded: true },
);

const { t } = useI18n();
const toast = useToast();
const preferences = useUserPreferencesStore();
const dismissing = ref(false);
const bannerVisible = computed(() => !preferences.isIntroBannerDismissed(props.bannerId));
const contentClasses = computed(() =>
  props.padded
    ? 'mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8'
    : 'flex min-h-0 min-w-0 w-full flex-1 flex-col',
);
const bannerContainerClasses = computed(() =>
  props.padded ? 'w-full min-w-0 shrink-0' : 'w-full min-w-0 shrink-0 px-4 pt-4',
);

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
