<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <div class="flex min-h-0 flex-1 flex-col">
      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb
            :items="[
              { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
              { icon: 'i-lucide-users', label: $t('layout.users') },
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

      <UAlert
        v-if="tableError"
        class="m-4"
        color="error"
        icon="i-lucide-circle-alert"
        variant="subtle"
        :title="$t('users.loadError')"
      />
      <UTable
        sticky
        v-model:column-pinning="columnPinning"
        class="min-h-0 flex-1"
        :columns="columns"
        :data="items"
        :empty="$t('users.empty')"
        :loading="loading"
        :ui="{
          th: 'first:pl-8 bg-neutral-100 dark:bg-neutral-950/20',
          td: 'first:pl-8',
        }"
      >
        <template #role-cell="{ row }">
          <UBadge color="neutral" variant="subtle">{{ $t(`roles.${row.original.role}`) }}</UBadge>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="whitespace-nowrap text-sm text-muted">{{ formatTimestamp(row.original.createdAt) }}</span>
        </template>
        <template #updatedAt-cell="{ row }">
          <span class="whitespace-nowrap text-sm text-muted">{{ formatTimestamp(row.original.updatedAt) }}</span>
        </template>
        <template #actions-header="{ column }">
          <span class="flex justify-end">{{ column.columnDef.header }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              color="error"
              icon="i-lucide-trash-2"
              variant="ghost"
              :aria-label="$t('users.delete')"
              :disabled="row.original.id === auth.user?.id"
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
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { FilterFieldType, type FilterField, type SortingField } from '@querry-kit/nuxt-ui/types';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import { useTable } from '~/composables/api/table';
import { useAuthStore } from '~/store/auth';
import type { User } from '~/types/api/resources';
import type { ColumnDefinition } from '~/types/table';

type UserRole = User['role'];
type UserRow = User & Record<string, unknown>;
type UserTableColumn = ColumnDefinition<UserRow> & { header: string; id: string };

definePageMeta({ fullWidth: true });

const { t } = useI18n();
const api = useFlowpeekApi();
const auth = useAuthStore();
const userRoleOptions = computed<Array<{ label: string; value: UserRole }>>(() =>
  (['SYSTEM_ADMIN', 'MANAGER', 'VIEWER'] as UserRole[]).map((role) => ({ label: t(`roles.${role}`), value: role })),
);
const columnDefinition = computed<UserTableColumn[]>(() => [
  { accessorKey: 'username', header: t('users.columns.username'), id: 'username' },
  { accessorKey: 'role', header: t('users.columns.role'), id: 'role' },
  { accessorKey: 'createdAt', header: t('users.columns.createdAt'), id: 'createdAt' },
  { accessorKey: 'updatedAt', header: t('users.columns.updatedAt'), id: 'updatedAt' },
  { enableHiding: false, header: t('users.columns.actions'), id: 'actions' },
]);
const sortableFields = computed<SortingField[]>(() => [
  { label: t('users.columns.username'), value: 'username' },
  { label: t('users.columns.role'), value: 'role' },
  { label: t('users.columns.createdAt'), value: 'createdAt' },
  { label: t('users.columns.updatedAt'), value: 'updatedAt' },
]);
const filterFields = computed<FilterField[]>(() => [
  {
    label: t('users.columns.role'),
    type: FilterFieldType.Enum,
    value: 'role',
    values: userRoleOptions.value,
  },
]);
const userTable = useTable({
  columnDefinition,
  defaultItemsPerPage: 10,
  endpoint: 'users',
  name: 'users',
  staticFields: ['id'],
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
} = userTable;
const columnPinning = computed({
  get: () => ({ left: userTable.columnPinning.value.left, right: userTable.columnPinning.value.right }),
  set: (value: { left?: string[]; right?: string[] }) => {
    userTable.columnPinning.value = value;
  },
});

/** Format an account timestamp in the active interface locale. */
function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

/** Delete a system user and refresh the current Query Kit page. */
async function remove(id: string): Promise<void> {
  await api.users.delete(id);
  await userTable.refresh();
}

onMounted(() => void userTable.initialize());
</script>
