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
      <UButton
        class="w-full p-0.5"
        color="neutral"
        to="/"
        variant="ghost"
        :label="collapsed ? undefined : 'Flowpeek'"
        :square="collapsed"
        :class="[!collapsed && 'py-2']"
        :block="collapsed"
      >
        <template #leading>
          <span class="flex size-7 items-center justify-center rounded-md bg-primary font-bold text-inverted">F</span>
        </template>
      </UButton>
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
      <div class="flex items-center gap-2 px-2 py-1">
        <p v-if="!collapsed" class="min-w-0 flex-1 text-xs text-muted">{{ t('layout.readOnlyStatus') }}</p>
        <UDashboardSidebarCollapse class="ml-auto" />
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
