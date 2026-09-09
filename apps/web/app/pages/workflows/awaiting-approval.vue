<template>
  <LayoutPage
    banner-id="awaiting-approval"
    icon="i-lucide-shield-alert"
    :breadcrumbs="[
      { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
      { icon: 'i-lucide-list-tree', label: $t('layout.workflowRuns'), to: '/workflow-runs' },
      { icon: 'i-lucide-shield-alert', label: $t('awaitingApproval.title') },
    ]"
    :description="$t('awaitingApproval.description')"
    :padded="false"
    :title="$t('awaitingApproval.title')"
  >
    <template #actions>
      <UInput
        v-model="search"
        class="w-36 sm:w-56"
        icon="i-lucide-search"
        :aria-label="$t('awaitingApproval.searchPlaceholder')"
        :placeholder="$t('awaitingApproval.searchPlaceholder')"
      />
      <UButton
        color="neutral"
        icon="i-lucide-refresh-cw"
        variant="soft"
        :aria-label="$t('dashboard.refresh')"
        :label="$t('dashboard.refresh')"
        :loading="loading"
        @click="loadRuns"
      />
    </template>

    <div class="mx-4 mt-4">
      <UAlert
        color="warning"
        data-provider-approval-notice
        icon="i-lucide-info"
        variant="subtle"
        :description="$t('awaitingApproval.providerApprovalDescription')"
        :title="$t('awaitingApproval.providerApprovalTitle')"
      />
    </div>

    <UAlert
      v-if="loadError"
      class="m-4"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      :title="$t('awaitingApproval.loadError')"
    />
    <UTable
      sticky
      class="min-h-0 flex-1 overflow-x-auto"
      data-awaiting-approval-table
      :columns="columns"
      :data="filteredRuns"
      :empty="$t('awaitingApproval.empty')"
      :loading="loading"
      :ui="{
        th: 'first:pl-6 whitespace-nowrap bg-neutral-100 dark:bg-neutral-950/20',
        td: 'first:pl-6 whitespace-nowrap',
      }"
    >
      <template #displayTitle-cell="{ row }">
        <span class="font-medium">{{ row.original.displayTitle }}</span>
      </template>
      <template #repository-cell="{ row }">
        <span>{{ row.original.repository.owner }}/{{ row.original.repository.name }}</span>
      </template>
      <template #provider-cell="{ row }">
        <EnumsProviderTypeBadge variant="subtle" :value="row.original.provider.providerType" />
      </template>
      <template #providerCreatedAt-cell="{ row }">
        <span class="whitespace-nowrap text-sm text-muted">{{ formatDateTime(row.original.providerCreatedAt) }}</span>
      </template>
      <template #actions-header="{ column }">
        <span class="flex justify-end">{{ column.columnDef.header }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-2">
          <UButton
            v-if="row.original.reviewUrl"
            color="neutral"
            icon="i-tabler-external-link"
            rel="noreferrer"
            size="sm"
            target="_blank"
            variant="ghost"
            :aria-label="$t('awaitingApproval.openReview')"
            :label="$t('awaitingApproval.openReview')"
            :to="row.original.reviewUrl"
          />
          <UButton
            color="warning"
            icon="i-tabler-external-link"
            rel="noreferrer"
            size="sm"
            target="_blank"
            variant="soft"
            :aria-label="$t('awaitingApproval.approveInProvider')"
            :label="$t('awaitingApproval.approveInProvider')"
            :to="row.original.url"
          />
        </div>
      </template>
    </UTable>
  </LayoutPage>
</template>

<script setup lang="ts">
import type { TableColumn } from '#ui/types';
import { computed, onMounted, ref } from 'vue';

import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import { useDateTime } from '~/composables/use-date-time';
import type { DashboardWorkflowRun } from '~/types/api/resources';

definePageMeta({ fullWidth: true });

const { t } = useI18n();
const api = useFlowpeekApi();
const { formatDateTime } = useDateTime();
const loadError = ref(false);
const loading = ref(true);
const runs = ref<DashboardWorkflowRun[]>([]);
const search = ref('');
const columns = computed<TableColumn<DashboardWorkflowRun>[]>(() => [
  { accessorKey: 'displayTitle', header: t('dashboard.workflow'), id: 'displayTitle' },
  { header: t('repositories.columns.name'), id: 'repository' },
  { header: t('repositories.addSteps.provider'), id: 'provider' },
  { accessorKey: 'providerCreatedAt', header: t('awaitingApproval.waitingSince'), id: 'providerCreatedAt' },
  { header: t('repositories.columns.actions'), id: 'actions' },
]);

useHead({ title: computed(() => t('awaitingApproval.title')) });

const filteredRuns = computed(() => {
  const value = search.value.trim().toLocaleLowerCase();
  if (!value) return runs.value;
  return runs.value.filter((run) =>
    [
      run.displayTitle,
      run.workflowName,
      run.repository.owner,
      run.repository.name,
      run.provider.displayName,
      run.provider.providerType,
    ]
      .join(' ')
      .toLocaleLowerCase()
      .includes(value),
  );
});

/** Load all approval-gated workflow runs visible to the current user. */
async function loadRuns(): Promise<void> {
  loading.value = true;
  loadError.value = false;
  try {
    runs.value = (await api.dashboard.getAwaitingApproval()).data;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => void loadRuns());
</script>
