<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <UAlert v-if="oauthStatus === 'connected'" color="success" :title="$t('providers.oauthConnected')" />
    <UAlert
      v-else-if="oauthStatus === 'failed'"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      :title="$t('providers.oauthError')"
    />

    <div class="flex min-h-0 flex-1 flex-col">
      <QTableToolbar
        v-model:column-order="columnOrder"
        v-model:column-pinning="columnPinning"
        v-model:filtering="filtering"
        v-model:invisible-columns="columnVisibility"
        v-model:sorting="sorting"
        :breadcrumb-items="[
          { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
          { icon: 'i-lucide-plug-zap', label: $t('layout.providers') },
        ]"
        :column-definitions="columnDefinition"
        :filter-fields="filterFields"
        :sortable-fields="sortableFields"
        shortcuts
        :ui="{ root: 'border-b border-default p-4' }"
      >
        <template #new>
          <UButton icon="i-lucide-plus" :label="$t('providers.add')" @click="openAddDialog" />
        </template>
      </QTableToolbar>

      <UAlert
        v-if="tableError"
        class="m-4"
        color="error"
        icon="i-lucide-circle-alert"
        variant="subtle"
        :title="$t('providers.loadError')"
      />
      <UTable
        sticky
        v-model:column-pinning="columnPinning"
        class="min-h-0 flex-1"
        :columns="columns"
        :data="items"
        :empty="$t('providers.empty')"
        :loading="loading"
        :ui="{
          th: 'first:pl-8 bg-neutral-100 dark:bg-neutral-950/20',
          td: 'first:pl-8',
        }"
      >
        <template #providerType-cell="{ row }">
          <EnumsProviderTypeBadge variant="subtle" :value="row.original.providerType" />
        </template>
        <template #baseUrl-cell="{ row }">
          <span class="break-all text-sm text-muted">{{ row.original.baseUrl ?? $t('providers.defaultUrl') }}</span>
        </template>
        <template #enabled-cell="{ row }">
          <UBadge variant="subtle" :color="row.original.enabled ? 'success' : 'neutral'">
            {{ row.original.enabled ? $t('providers.enabled') : $t('providers.disabled') }}
          </UBadge>
        </template>
        <template #lastSyncAt-cell="{ row }">
          <span class="whitespace-nowrap text-sm text-muted">{{ formatLastSync(row.original.lastSyncAt) }}</span>
        </template>
        <template #actions-header="{ column }">
          <span class="flex justify-end">{{ column.columnDef.header }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton
              color="neutral"
              variant="ghost"
              :aria-label="row.original.enabled ? $t('providers.disable') : $t('providers.enable')"
              :disabled="isProviderPending(row.original.id)"
              :icon="row.original.enabled ? 'i-lucide-pause' : 'i-lucide-play'"
              :loading="isPending(providerActionKey('toggle', row.original.id))"
              @click="toggle(row.original)"
            />
            <UButton
              color="error"
              icon="i-lucide-trash-2"
              variant="ghost"
              :aria-label="$t('providers.delete')"
              :disabled="isProviderPending(row.original.id)"
              :loading="isPending(providerActionKey('delete', row.original.id))"
              @click="remove(row.original.id)"
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
    </div>

    <ModulesProvidersAddDialog v-model:open="dialogOpen" @created="handleProviderCreated" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { FilterFieldType, type FilterField, type SortingField } from '@querry-kit/nuxt-ui/types';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import { useTable } from '~/composables/api/table';
import { useProviderType } from '~/composables/enums/provider-type';
import { useDateTime } from '~/composables/use-date-time';
import { usePendingActions } from '~/composables/use-pending-actions';
import { providerTypes, type ProviderAccount } from '~/types/api/resources';
import type { ColumnDefinition } from '~/types/table';

type ProviderAccountRow = ProviderAccount & Record<string, unknown>;
type ProviderTableColumn = ColumnDefinition<ProviderAccountRow> & { header: string; id: string };

definePageMeta({ fullWidth: true });

const { t } = useI18n();
const { formatDateTime } = useDateTime();
const api = useFlowpeekApi();
const route = useRoute();
const dialogOpen = ref(false);
const { isPending, run: runPendingAction } = usePendingActions();
const oauthStatus = computed(() => route.query.oauth);
const { getLabel: getProviderTypeLabel } = useProviderType();
const providerTypeOptions = computed(() =>
  providerTypes.map((providerType) => ({ label: getProviderTypeLabel(providerType), value: providerType })),
);
const columnDefinition = computed<ProviderTableColumn[]>(() => [
  { accessorKey: 'displayName', header: t('providers.columns.name'), id: 'displayName' },
  { accessorKey: 'providerType', header: t('providers.columns.type'), id: 'providerType' },
  { accessorKey: 'baseUrl', header: t('providers.columns.baseUrl'), id: 'baseUrl' },
  { accessorKey: 'enabled', header: t('providers.columns.status'), id: 'enabled' },
  { accessorKey: 'lastSyncAt', header: t('providers.columns.lastSync'), id: 'lastSyncAt' },
  { enableHiding: false, header: t('providers.columns.actions'), id: 'actions' },
]);
const sortableFields = computed<SortingField[]>(() => [
  { label: t('providers.columns.name'), value: 'displayName' },
  { label: t('providers.columns.type'), value: 'providerType' },
  { label: t('providers.columns.status'), value: 'enabled' },
  { label: t('providers.columns.lastSync'), value: 'lastSyncAt' },
]);
const filterFields = computed<FilterField[]>(() => [
  {
    label: t('providers.columns.type'),
    type: FilterFieldType.Enum,
    value: 'providerType',
    values: providerTypeOptions.value.map(({ label, value }) => ({ label, value })),
  },
  { label: t('providers.columns.status'), type: FilterFieldType.Boolean, value: 'enabled' },
]);
const providerTable = useTable({
  columnDefinition,
  defaultItemsPerPage: 10,
  endpoint: 'provider-accounts',
  name: 'provider-accounts',
  staticFields: ['id', 'enabled'],
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
} = providerTable;
const columnPinning = computed({
  get: () => ({ left: providerTable.columnPinning.value.left, right: providerTable.columnPinning.value.right }),
  set: (value: { left?: string[]; right?: string[] }) => {
    providerTable.columnPinning.value = value;
  },
});

/** Format a provider's last successful synchronization in the active interface locale. */
function formatLastSync(lastSyncAt: string | null): string {
  if (!lastSyncAt) return t('providers.neverSynced');
  return formatDateTime(lastSyncAt);
}

function openAddDialog(): void {
  dialogOpen.value = true;
}

/** Build a unique pending-state key for one provider action. */
function providerActionKey(action: 'delete' | 'toggle', providerId: string): string {
  return `${action}:${providerId}`;
}

/** Return whether any mutation is active for a provider row. */
function isProviderPending(providerId: string): boolean {
  return isPending(providerActionKey('delete', providerId)) || isPending(providerActionKey('toggle', providerId));
}

defineShortcuts({
  shift_n: () => openAddDialog(),
});

/** Refresh the list from its first page after the dialog creates an account. */
async function handleProviderCreated(): Promise<void> {
  page.value = 1;
  await providerTable.refresh();
}

/** Remove a provider account and refresh the current Query Kit page. */
async function remove(id: string): Promise<void> {
  await runPendingAction(providerActionKey('delete', id), async () => {
    await api.providerAccounts.delete(id);
    await providerTable.refresh();
  });
}

/** Enable or disable a provider account without changing its stored credentials. */
async function toggle(provider: ProviderAccount): Promise<void> {
  await runPendingAction(providerActionKey('toggle', provider.id), async () => {
    await api.providerAccounts.update(provider.id, { enabled: !provider.enabled });
    await providerTable.refresh();
  });
}

onMounted(() => void providerTable.initialize());
</script>
