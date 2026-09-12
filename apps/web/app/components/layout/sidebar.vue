<template>
  <UDashboardSidebar
    id="ezrepo"
    collapsible
    resizable
    class="bg-elevated/25"
    role="complementary"
    :default-size="16"
    :aria-label="t('layout.sidebarNavigation')"
    :ui="{ footer: 'flex-col items-stretch' }"
  >
    <template #header="{ collapsed }">
      <NuxtLink
        to="/"
        aria-label="ezRepo"
        class="font-display text-xl font-bold"
        :class="collapsed ? 'mx-auto' : undefined"
      >
        <span class="text-primary">ez</span>
        <span v-if="!collapsed" class="tracking-tight text-highlighted">Repo</span>
      </NuxtLink>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu
        orientation="vertical"
        :aria-label="t('layout.primaryNavigation')"
        :collapsed="collapsed"
        :items="navigationItems"
        popover
        tooltip
      />
    </template>

    <template #footer="{ collapsed }">
      <div data-sidebar-footer class="flex w-full flex-col gap-1" :class="collapsed ? 'items-center' : 'items-start'">
        <UButton
          data-sidebar-footer-item
          to="https://github.com/tobiaswaelde/ezrepo"
          target="_blank"
          color="neutral"
          variant="ghost"
          icon="i-simple-icons-github"
          :aria-label="t('sidebar.github')"
          :title="t('sidebar.github')"
          :square="collapsed"
          :label="collapsed ? undefined : t('sidebar.githubLabel')"
          :class="collapsed ? undefined : 'w-full justify-start'"
        />
        <UButton
          data-sidebar-footer-item
          to="https://tobiaswaelde.github.io/ezrepo/"
          target="_blank"
          color="neutral"
          variant="ghost"
          icon="i-tabler-book-2"
          :aria-label="t('sidebar.docs')"
          :title="t('sidebar.docs')"
          :square="collapsed"
          :label="collapsed ? undefined : t('sidebar.docsLabel')"
          :class="collapsed ? undefined : 'w-full justify-start'"
        />
        <button
          v-if="!collapsed"
          data-sidebar-footer-item
          type="button"
          class="flex w-full items-center justify-center gap-1.5 rounded-md px-1.5 py-1 font-mono text-xs text-muted transition-colors hover:bg-elevated hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          :aria-label="t('changelog.open')"
          @click="changelogOpen = true"
        >
          v{{ appVersion }}
          <UBadge v-if="updateAvailable" color="neutral" variant="subtle" size="sm">
            <span data-update-indicator class="size-1.5 rounded-full bg-success" aria-hidden="true" />
            {{ t('changelog.update') }}
          </UBadge>
        </button>
      </div>
    </template>
  </UDashboardSidebar>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useEzRepoApi } from '~/composables/api/ezrepo-api';
import { useModuleApi } from '~/composables/api/module-api';
import { useNavigationItems } from '~/composables/app/navigation-items';

const { t } = useI18n();
const api = useEzRepoApi();
const appVersion = useRuntimeConfig().public.appVersion;
const changelogOpen = useState('changelog-open', () => false);
const latestVersion = ref<string | null>(null);
const updateAvailable = computed(() => compareSemver(latestVersion.value, appVersion) > 0);
const needsAttentionApi = useModuleApi('workflow-runs/needs-attention');
const awaitingApprovalCount = ref<number | null>(null);
const needsAttentionCount = ref<number | null>(null);
const { navigationItems } = useNavigationItems({
  awaitingApproval: awaitingApprovalCount,
  needsAttention: needsAttentionCount,
});

/** Load permission-scoped workflow attention counters without blocking the application shell. */
async function loadAttentionCounts(): Promise<void> {
  const [awaitingApprovalResult, needsAttentionResult] = await Promise.allSettled([
    api.dashboard.getAwaitingApproval(),
    needsAttentionApi.query({ fields: 'id', page: 1, perPage: 1 }),
  ]);

  awaitingApprovalCount.value =
    awaitingApprovalResult.status === 'fulfilled' ? awaitingApprovalResult.value.data.length : null;
  needsAttentionCount.value =
    needsAttentionResult.status === 'fulfilled' ? needsAttentionResult.value.data.meta.itemCount : null;
}

onMounted(() => void loadAttentionCounts());

function compareSemver(left: string | null, right: string): number {
  if (!left) return 0;
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

onMounted(async () => {
  try {
    latestVersion.value = (await api.version()).data.latest;
  } catch {
    latestVersion.value = null;
  }
});
</script>
