<template>
  <UDashboardSidebar
    id="flowpeek"
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
      <div class="flex w-full flex-col gap-1">
        <UButton
          to="https://github.com/tobiaswaelde/ezrepo"
          target="_blank"
          color="neutral"
          variant="ghost"
          icon="i-tabler-brand-github"
          aria-label="GitHub"
          :square="collapsed"
          :label="collapsed ? undefined : 'GitHub'"
          :class="collapsed ? 'self-center' : 'w-full justify-start'"
        />
        <div class="flex items-center gap-2 px-2 py-1">
          <p v-if="!collapsed" class="min-w-0 flex-1 text-xs text-muted">{{ t('layout.readOnlyStatus') }}</p>
          <UDashboardSidebarCollapse class="ml-auto" />
        </div>
      </div>
    </template>
  </UDashboardSidebar>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import { useModuleApi } from '~/composables/api/module-api';
import { useNavigationItems } from '~/composables/app/navigation-items';

const { t } = useI18n();
const api = useFlowpeekApi();
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
</script>
