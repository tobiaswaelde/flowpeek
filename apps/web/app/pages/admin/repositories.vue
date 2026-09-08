<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { FilterFieldType, type FilterField, type SortingField } from '@querry-kit/nuxt-ui/types';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import { useTable } from '~/composables/api/table';
import type { Repository } from '~/types/api/resources';
import type { ColumnDefinition } from '~/types/table';

type RepositoryRow = Repository & Record<string, unknown>;
type RepositoryTableColumn = ColumnDefinition<RepositoryRow> & { header: string; id: string };

definePageMeta({ fullWidth: true });

const { t } = useI18n();
const api = useFlowpeekApi();
const columnDefinition = computed<RepositoryTableColumn[]>(() => [
  { accessorKey: 'owner', header: t('repositories.columns.owner'), id: 'owner' },
  { accessorKey: 'name', header: t('repositories.columns.name'), id: 'name' },
  { accessorKey: 'enabled', header: t('repositories.columns.status'), id: 'enabled' },
  {
    accessorKey: 'workflowRunRetentionDays',
    header: t('repositories.columns.retention'),
    id: 'workflowRunRetentionDays',
  },
  { accessorKey: 'lastSyncAt', header: t('repositories.columns.lastSync'), id: 'lastSyncAt' },
  { enableHiding: false, header: t('repositories.columns.actions'), id: 'actions' },
]);
const sortableFields = computed<SortingField[]>(() => [
  { label: t('repositories.columns.owner'), value: 'owner' },
  { label: t('repositories.columns.name'), value: 'name' },
  { label: t('repositories.columns.status'), value: 'enabled' },
  { label: t('repositories.columns.retention'), value: 'workflowRunRetentionDays' },
  { label: t('repositories.columns.lastSync'), value: 'lastSyncAt' },
]);
const filterFields = computed<FilterField[]>(() => [
  { label: t('repositories.columns.status'), type: FilterFieldType.Boolean, value: 'enabled' },
]);
const repositoryTable = useTable({
  columnDefinition,
  defaultItemsPerPage: 10,
  endpoint: 'repositories',
  name: 'repositories',
  staticFields: ['id', 'enabled', 'url', 'workflowRunRetentionDays'],
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
} = repositoryTable;
const columnPinning = computed({
  get: () => ({ left: repositoryTable.columnPinning.value.left, right: repositoryTable.columnPinning.value.right }),
  set: (value: { left?: string[]; right?: string[] }) => {
    repositoryTable.columnPinning.value = value;
  },
});

/** Format a repository's last successful synchronization in the active interface locale. */
function formatLastSync(lastSyncAt: string | null): string {
  if (!lastSyncAt) return t('repositories.neverSynced');
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastSyncAt));
}

/** Enable or disable a repository without changing its retention configuration. */
async function toggle(repository: Repository): Promise<void> {
  await api.repositories.update(repository.id, {
    enabled: !repository.enabled,
    workflowRunRetentionDays: repository.workflowRunRetentionDays,
  });
  repositoryTable.updateRow({ ...repository, enabled: !repository.enabled } as RepositoryRow);
}

onMounted(() => void repositoryTable.initialize());
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <div class="flex min-h-0 flex-1 flex-col">
      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb
            :items="[
              { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
              { icon: 'i-lucide-git-branch', label: $t('layout.repositories') },
            ]"
          />
        </template>
        <template #right>
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
      </UDashboardToolbar>

      <UAlert v-if="tableError" class="m-4" color="error" :title="$t('repositories.loadError')" />
      <UTable
        sticky
        class="min-h-0 flex-1"
        :columns="columns"
        :data="items"
        :empty="$t('repositories.empty')"
        :loading="loading"
        :ui="{
          th: 'first:pl-6 bg-neutral-100 dark:bg-neutral-950/20',
          td: 'first:pl-6',
        }"
      >
        <template #name-cell="{ row }">
          <a class="font-medium hover:underline" :href="row.original.url" rel="noreferrer" target="_blank">
            {{ row.original.name }}
          </a>
        </template>
        <template #enabled-cell="{ row }">
          <UBadge :color="row.original.enabled ? 'success' : 'neutral'" variant="subtle">
            {{ row.original.enabled ? $t('repositories.enabled') : $t('repositories.disabled') }}
          </UBadge>
        </template>
        <template #workflowRunRetentionDays-cell="{ row }">
          <span class="text-sm text-muted">
            {{ row.original.workflowRunRetentionDays ?? $t('repositories.default') }}
          </span>
        </template>
        <template #lastSyncAt-cell="{ row }">
          <span class="whitespace-nowrap text-sm text-muted">{{ formatLastSync(row.original.lastSyncAt) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <UButton
            :aria-label="row.original.enabled ? $t('repositories.disable') : $t('repositories.enable')"
            :icon="row.original.enabled ? 'i-lucide-pause' : 'i-lucide-play'"
            color="neutral"
            size="sm"
            variant="ghost"
            @click="toggle(row.original)"
          />
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
