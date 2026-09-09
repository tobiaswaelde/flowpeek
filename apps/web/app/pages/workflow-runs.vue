<template>
  <LayoutPage
    banner-id="workflow-runs"
    icon="i-lucide-list-tree"
    :breadcrumbs="[
      { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
      { icon: 'i-lucide-list-tree', label: $t('layout.workflowRuns') },
    ]"
    :description="$t('workflowRuns.description')"
    :padded="false"
    :title="$t('workflowRuns.title')"
  >
    <template #actions>
      <QTableSorting v-model:sorting="sorting" :fields="sortableFields" shortcuts />
      <QTableFiltering v-model:filtering="filtering" :fields="filterFields" shortcuts />
      <QTableOptions
        v-model:column-order="columnOrder"
        v-model:column-pinning="columnPinning"
        v-model:invisible-columns="columnVisibility"
        :columns="columnDefinition"
        shortcuts
      />
    </template>

    <UAlert
      v-if="tableError"
      class="m-4"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      :title="$t('workflowRuns.loadError')"
    />
    <UTable
      sticky
      v-model:column-pinning="columnPinning"
      class="min-h-0 flex-1"
      :columns="columns"
      :data="items"
      :empty="$t('workflowRuns.empty')"
      :loading="loading"
      :ui="{
        th: 'first:pl-6 bg-neutral-100 dark:bg-neutral-950/20',
        td: 'first:pl-6',
      }"
    >
      <template #displayTitle-cell="{ row }">
        <span class="font-medium">{{ row.original.displayTitle }}</span>
      </template>
      <template #repositoryName-cell="{ row }">
        <span>{{ row.original.repositoryOwner }}/{{ row.original.repositoryName }}</span>
      </template>
      <template #providerType-cell="{ row }">
        <EnumsProviderTypeBadge variant="subtle" :value="row.original.providerType" />
      </template>
      <template #status-cell="{ row }">
        <UBadge variant="subtle" :color="statusColor(row.original.status)">
          {{ $t(`workflowStatus.${row.original.status}`) }}
        </UBadge>
      </template>
      <template #completedAt-cell="{ row }">
        <span class="whitespace-nowrap text-sm text-muted">{{ formatTimestamp(row.original.completedAt) }}</span>
      </template>
      <template #durationMs-cell="{ row }">
        <span class="whitespace-nowrap text-sm text-muted">{{ formatDuration(row.original.durationMs) }}</span>
      </template>
      <template #actions-header="{ column }">
        <span class="flex justify-end">{{ column.columnDef.header }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UButton
            color="neutral"
            icon="i-tabler-external-link"
            rel="noreferrer"
            target="_blank"
            variant="ghost"
            :aria-label="$t('dashboard.openProvider')"
            :to="row.original.url"
          />
        </div>
      </template>
    </UTable>
    <QTablePagination
      v-model:items-per-page="itemsPerPage"
      v-model:page="page"
      class="border-t border-default"
      :total-items="totalItems"
      shortcuts
    />
  </LayoutPage>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { FilterFieldType, type FilterField, type SortingField } from '@querry-kit/nuxt-ui/types';
import { useTable } from '~/composables/api/table';
import { useDateTime } from '~/composables/use-date-time';
import type { WorkflowRun, WorkflowRunStatus } from '~/types/api/resources';
import type { ColumnDefinition } from '~/types/table';

type WorkflowRunRow = WorkflowRun & Record<string, unknown>;
type WorkflowRunTableColumn = ColumnDefinition<WorkflowRunRow> & { header: string; id: string };

definePageMeta({ fullWidth: true });

const { t } = useI18n();
const { formatDateTime } = useDateTime();
const workflowStatuses: WorkflowRunStatus[] = [
  'QUEUED',
  'RUNNING',
  'SUCCESS',
  'FAILED',
  'CANCELLED',
  'SKIPPED',
  'UNKNOWN',
];
const columnDefinition = computed<WorkflowRunTableColumn[]>(() => [
  { accessorKey: 'displayTitle', header: t('workflowRuns.columns.workflow'), id: 'displayTitle' },
  { accessorKey: 'repositoryName', header: t('repositories.columns.name'), id: 'repositoryName' },
  { accessorKey: 'providerType', header: t('repositories.addSteps.provider'), id: 'providerType' },
  { accessorKey: 'status', header: t('workflowRuns.columns.status'), id: 'status' },
  { accessorKey: 'durationMs', header: t('workflowRuns.columns.duration'), id: 'durationMs' },
  { accessorKey: 'completedAt', header: t('workflowRuns.columns.completed'), id: 'completedAt' },
  { enableHiding: false, header: t('repositories.columns.actions'), id: 'actions' },
]);
const sortableFields = computed<SortingField[]>(() => [
  { label: t('workflowRuns.columns.workflow'), value: 'displayTitle' },
  { label: t('workflowRuns.columns.status'), value: 'status' },
  { label: t('workflowRuns.columns.duration'), value: 'durationMs' },
  { label: t('workflowRuns.columns.completed'), value: 'completedAt' },
]);
const filterFields = computed<FilterField[]>(() => [
  {
    label: t('workflowRuns.columns.status'),
    type: FilterFieldType.Enum,
    value: 'status',
    values: workflowStatuses.map((status) => ({ label: t(`workflowStatus.${status}`), value: status })),
  },
]);
const workflowRunTable = useTable({
  columnDefinition,
  defaultItemsPerPage: 25,
  endpoint: 'workflow-runs',
  name: 'workflow-runs',
  staticFields: ['id', 'repositoryOwner', 'url'],
});
const {
  columnOrder,
  columnVisibility,
  columns,
  error: tableError,
  filtering,
  items,
  itemsPerPage,
  loading,
  page,
  sorting,
  totalItems,
} = workflowRunTable;
const columnPinning = computed({
  get: () => ({ left: workflowRunTable.columnPinning.value.left, right: workflowRunTable.columnPinning.value.right }),
  set: (value: { left?: string[]; right?: string[] }) => {
    workflowRunTable.columnPinning.value = value;
  },
});

useHead({ title: computed(() => t('workflowRuns.title')) });

/** Format a provider timestamp in the active interface locale. */
function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return t('workflowRuns.notAvailable');
  return formatDateTime(timestamp);
}

/** Format a persisted duration as a compact, readable minutes-and-seconds value. */
function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return t('workflowRuns.notAvailable');
  const seconds = Math.floor(durationMs / 1_000);
  return t('workflowRuns.durationValue', { minutes: Math.floor(seconds / 60), seconds: seconds % 60 });
}

/** Choose a compact semantic badge color for every normalized workflow status. */
function statusColor(status: WorkflowRunStatus): 'error' | 'info' | 'neutral' | 'success' | 'warning' {
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILED') return 'error';
  if (status === 'RUNNING' || status === 'QUEUED') return 'info';
  if (status === 'CANCELLED' || status === 'SKIPPED') return 'warning';
  return 'neutral';
}

onMounted(() => void workflowRunTable.initialize());
</script>
