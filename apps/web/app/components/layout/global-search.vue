<template>
  <div class="relative hidden sm:block">
    <div
      class="flex w-72 items-center rounded-md border border-default bg-elevated px-3 transition-colors focus-within:border-primary"
      @click="searchInput?.focus()"
    >
      <span class="font-display text-xs font-semibold text-primary">&gt;_</span>
      <input
        ref="searchInput"
        v-model="query"
        :aria-label="t('layout.search')"
        :placeholder="t('layout.searchPlaceholder')"
        autocomplete="off"
        class="w-full border-0 bg-transparent py-1.5 pl-2 text-sm outline-none placeholder:text-muted"
        @focus="isOpen = true"
        @keydown.escape="close"
      />
      <UKbd class="ml-auto hidden font-mono text-[10px] lg:inline-flex">/</UKbd>
    </div>

    <div
      v-if="isOpen && query.trim().length >= 2"
      class="absolute left-0 top-full z-50 mt-1 w-96 overflow-hidden rounded-lg border border-default bg-default shadow-lg"
    >
      <div v-if="hasResults" class="max-h-96 overflow-y-auto py-1">
        <template v-if="navigationResults.length">
          <p class="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
            {{ t('layout.searchNavigation') }}
          </p>
          <NuxtLink
            v-for="item in navigationResults"
            :key="item.to"
            class="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-elevated"
            :to="item.to"
            @click="close"
          >
            <UIcon :name="item.icon" class="size-4 shrink-0 text-muted" />
            <span class="font-medium">{{ item.label }}</span>
          </NuxtLink>
        </template>

        <template v-if="workflowRuns.length">
          <p class="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
            {{ t('layout.searchWorkflowRuns') }}
          </p>
          <a
            v-for="workflowRun in workflowRuns"
            :key="workflowRun.id"
            class="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-elevated"
            :href="workflowRun.url"
            rel="noopener"
            target="_blank"
            @click="close"
          >
            <UIcon name="i-tabler-activity" class="size-4 shrink-0 text-muted" />
            <span class="min-w-0 flex-1 truncate font-medium">{{ workflowRun.workflowName }}</span>
            <UBadge size="xs" variant="subtle">{{ workflowRun.status }}</UBadge>
          </a>
        </template>
      </div>

      <div v-else-if="isSearching" class="flex items-center justify-center py-4">
        <UIcon class="size-4 animate-spin text-muted" name="i-tabler-loader-2" />
      </div>

      <p v-else class="py-4 text-center text-sm text-muted">{{ t('layout.searchNoResults') }}</p>
    </div>

    <div v-if="isOpen && query.trim().length >= 2" class="fixed inset-0 z-40" @click="close" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useModuleApi } from '~/composables/api/module-api';
import { useAuthStore } from '~/store/auth';
import type { WorkflowRun } from '~/types/api/resources';

interface NavigationSearchItem {
  icon: string;
  label: string;
  to: string;
}

const { t } = useI18n();
const auth = useAuthStore();
const workflowRunsApi = useModuleApi('workflow-runs');
const searchInput = ref<HTMLInputElement>();
const query = ref('');
const workflowRuns = ref<WorkflowRun[]>([]);
const isOpen = ref(false);
const isSearching = ref(false);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let requestId = 0;

const navigationItems = computed<NavigationSearchItem[]>(() => {
  const items: NavigationSearchItem[] = [
    { icon: 'i-tabler-layout-dashboard', label: t('layout.dashboard'), to: '/' },
    { icon: 'i-tabler-bell', label: t('layout.notifications'), to: '/notifications' },
  ];

  if (auth.user?.role === 'SYSTEM_ADMIN') {
    items.push(
      { icon: 'i-tabler-plug-connected', label: t('layout.providers'), to: '/admin/providers' },
      { icon: 'i-tabler-git-fork', label: t('layout.repositories'), to: '/admin/repositories' },
      { icon: 'i-tabler-users', label: t('layout.users'), to: '/admin/users' },
    );
  }

  return items;
});

const navigationResults = computed(() => {
  const searchTerm = query.value.trim().toLocaleLowerCase();
  return navigationItems.value.filter((item) => item.label.toLocaleLowerCase().includes(searchTerm));
});

const hasResults = computed(() => navigationResults.value.length > 0 || workflowRuns.value.length > 0);

watch(query, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer);

  const searchTerm = value.trim();
  const activeRequestId = ++requestId;
  workflowRuns.value = [];

  if (searchTerm.length < 2) {
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  debounceTimer = setTimeout(async () => {
    try {
      const response = await workflowRunsApi.query({ page: 1, perPage: 6, search: searchTerm });
      if (activeRequestId === requestId) workflowRuns.value = response.data.items;
    } catch {
      if (activeRequestId === requestId) workflowRuns.value = [];
    } finally {
      if (activeRequestId === requestId) isSearching.value = false;
    }
  }, 250);
});

/** Dismiss the search overlay and restore a neutral search state. */
function close(): void {
  isOpen.value = false;
}

/** Focus global search when slash is pressed outside an editable field. */
function handleKeyboardShortcut(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (event.key !== '/' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return;
  event.preventDefault();
  isOpen.value = true;
  searchInput.value?.focus();
}

onMounted(() => document.addEventListener('keydown', handleKeyboardShortcut));
onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  document.removeEventListener('keydown', handleKeyboardShortcut);
});
</script>
