<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <div class="flex min-h-0 flex-1 flex-col">
      <QTableToolbar
        v-model:column-order="columnOrder"
        v-model:column-pinning="columnPinning"
        v-model:filtering="filtering"
        v-model:invisible-columns="columnVisibility"
        v-model:sorting="sorting"
        :breadcrumb-items="[
          { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
          { icon: 'i-lucide-list-tree', label: $t('layout.workflowRuns') },
        ]"
        :column-definitions="columnDefinition"
        :filter-fields="filterFields"
        :sortable-fields="sortableFields"
        shortcuts
        :ui="{ root: 'border-b border-default p-4' }"
      />

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
        <template #workflowName-cell="{ row }">
          <a class="font-medium hover:underline" rel="noreferrer" target="_blank" :href="row.original.url">
            {{ row.original.workflowName }}
          </a>
        </template>
        <template #status-cell="{ row }">
          <UBadge variant="subtle" :color="statusColor(row.original.status)">
            {{ $t(`workflowStatus.${row.original.status}`) }}
          </UBadge>
        </template>
        <template #providerCreatedAt-cell="{ row }">
          <span class="whitespace-nowrap text-sm text-muted">
            {{ formatTimestamp(row.original.providerCreatedAt) }}
          </span>
        </template>
        <template #startedAt-cell="{ row }">
          <span class="whitespace-nowrap text-sm text-muted">{{ formatTimestamp(row.original.startedAt) }}</span>
        </template>
        <template #completedAt-cell="{ row }">
          <span class="whitespace-nowrap text-sm text-muted">{{ formatTimestamp(row.original.completedAt) }}</span>
        </template>
        <template #durationMs-cell="{ row }">
          <span class="whitespace-nowrap text-sm text-muted">{{ formatDuration(row.original.durationMs) }}</span>
        </template>
        <template #providerRunId-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{ row.original.providerRunId }}</span>
        </template>
      </UTable>
      <QTablePagination
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        class="border-t border-default"
        :total-items="totalItems"
        shortcuts
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { FilterFieldType, type FilterField, type SortingField } from '@querry-kit/nuxt-ui/types';
import { useTable } from '~/composables/api/table';
import type { WorkflowRun, WorkflowRunStatus } from '~/types/api/resources';
import type { ColumnDefinition } from '~/types/table';

type WorkflowRunRow = WorkflowRun & Record<string, unknown>;
type WorkflowRunTableColumn = ColumnDefinition<WorkflowRunRow> & { header: string; id: string };

definePageMeta({ fullWidth: true });

const { t } = useI18n();
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
  { accessorKey: 'workflowName', header: t('workflowRuns.columns.workflow'), id: 'workflowName' },
  { accessorKey: 'status', header: t('workflowRuns.columns.status'), id: 'status' },
  { accessorKey: 'providerCreatedAt', header: t('workflowRuns.columns.created'), id: 'providerCreatedAt' },
  { accessorKey: 'startedAt', header: t('workflowRuns.columns.started'), id: 'startedAt' },
  { accessorKey: 'completedAt', header: t('workflowRuns.columns.completed'), id: 'completedAt' },
  { accessorKey: 'durationMs', header: t('workflowRuns.columns.duration'), id: 'durationMs' },
  { accessorKey: 'providerRunId', header: t('workflowRuns.columns.providerRunId'), id: 'providerRunId' },
]);
const sortableFields = computed<SortingField[]>(() => [
  { label: t('workflowRuns.columns.workflow'), value: 'workflowName' },
  { label: t('workflowRuns.columns.status'), value: 'status' },
  { label: t('workflowRuns.columns.created'), value: 'providerCreatedAt' },
  { label: t('workflowRuns.columns.started'), value: 'startedAt' },
  { label: t('workflowRuns.columns.completed'), value: 'completedAt' },
  { label: t('workflowRuns.columns.duration'), value: 'durationMs' },
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
  staticFields: ['id', 'url'],
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

/** Format a provider timestamp in the active interface locale. */
function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return t('workflowRuns.notAvailable');
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
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
