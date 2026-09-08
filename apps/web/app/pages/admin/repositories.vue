<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { FilterFieldType, type FilterField, type SortingField } from '@querry-kit/nuxt-ui/types';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import { useTable } from '~/composables/api/table';
import { useProviderType } from '~/composables/enums/provider-type';
import type { ProviderAccount, ProviderRepository, Repository } from '~/types/api/resources';
import type { ColumnDefinition } from '~/types/table';

type RepositoryRow = Repository & Record<string, unknown>;
type RepositoryTableColumn = ColumnDefinition<RepositoryRow> & { header: string; id: string };

definePageMeta({ fullWidth: true });

const { t } = useI18n();
const api = useFlowpeekApi();
const { getLabel: getProviderTypeLabel } = useProviderType();
const dialogOpen = ref(false);
const providerAccounts = ref<ProviderAccount[]>([]);
const providerAccountsLoading = ref(false);
const providerAccountsError = ref(false);
const availableRepositories = ref<ProviderRepository[]>([]);
const repositoriesLoading = ref(false);
const repositoriesError = ref(false);
const addingRepository = ref(false);
const addingRepositoryError = ref(false);
const selectedProviderAccountId = ref<string | undefined>();
const selectedProviderRepositoryId = ref<string | undefined>();
const stepper = useTemplateRef('stepper');
const stepperItems = computed(() => [
  { icon: 'i-lucide-plug-zap', slot: 'provider', title: t('repositories.addSteps.provider') },
  { icon: 'i-lucide-git-branch', slot: 'repository', title: t('repositories.addSteps.repository') },
]);
const providerOptions = computed(() =>
  providerAccounts.value.map((account) => ({
    label: `${account.displayName} (${getProviderTypeLabel(account.providerType)})`,
    value: account.id,
  })),
);
const providerRepositoryOptions = computed(() =>
  availableRepositories.value.map((repository) => ({
    description: repository.url,
    disabled: repository.tracked,
    label: repository.tracked
      ? `${repository.owner}/${repository.name} (${t('repositories.alreadyTracked')})`
      : `${repository.owner}/${repository.name}`,
    value: repository.providerRepositoryId,
  })),
);
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

/** Reset and open the two-step provider repository discovery dialog. */
async function openAddDialog(): Promise<void> {
  addingRepositoryError.value = false;
  availableRepositories.value = [];
  providerAccountsError.value = false;
  repositoriesError.value = false;
  selectedProviderAccountId.value = undefined;
  selectedProviderRepositoryId.value = undefined;
  dialogOpen.value = true;
  providerAccountsLoading.value = true;

  try {
    const { data } = await api.providerAccounts.list();
    providerAccounts.value = data.items.filter((account) => account.enabled);
  } catch {
    providerAccountsError.value = true;
  } finally {
    providerAccountsLoading.value = false;
  }
}

defineShortcuts({
  shift_n: () => void openAddDialog(),
});

/** Load the provider-owned repository list whenever the first dialog step changes. */
async function loadAvailableRepositories(providerAccountId: string): Promise<void> {
  repositoriesLoading.value = true;
  repositoriesError.value = false;

  try {
    const { data } = await api.providerAccounts.listRepositories(providerAccountId);
    if (selectedProviderAccountId.value === providerAccountId) availableRepositories.value = data;
  } catch {
    if (selectedProviderAccountId.value === providerAccountId) repositoriesError.value = true;
  } finally {
    if (selectedProviderAccountId.value === providerAccountId) repositoriesLoading.value = false;
  }
}

watch(selectedProviderAccountId, (providerAccountId) => {
  selectedProviderRepositoryId.value = undefined;
  availableRepositories.value = [];
  repositoriesError.value = false;
  if (providerAccountId) void loadAvailableRepositories(providerAccountId);
});

/** Add the repository selected in the final dialog step and refresh the current Query Kit table page. */
async function addRepository(): Promise<void> {
  if (!selectedProviderAccountId.value || !selectedProviderRepositoryId.value) return;

  addingRepository.value = true;
  addingRepositoryError.value = false;
  try {
    await api.providerAccounts.addRepository(selectedProviderAccountId.value, selectedProviderRepositoryId.value);
    dialogOpen.value = false;
    page.value = 1;
    await repositoryTable.refresh();
  } catch {
    addingRepositoryError.value = true;
  } finally {
    addingRepository.value = false;
  }
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
          <UButton :label="$t('repositories.add')" icon="i-lucide-plus" @click="openAddDialog" />
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

    <UModal
      v-model:open="dialogOpen"
      :description="$t('repositories.addDescription')"
      :dismissible="!addingRepository"
      :title="$t('repositories.addDialogTitle')"
    >
      <template #body>
        <UAlert v-if="addingRepositoryError" color="error" :title="$t('repositories.addError')" />
        <UAlert v-else-if="providerAccountsError" color="error" :title="$t('repositories.providerLoadError')" />

        <UStepper ref="stepper" class="mt-4" color="neutral" size="sm" :items="stepperItems">
          <template #provider>
            <div class="space-y-4">
              <p class="text-sm text-muted">{{ $t('repositories.providerDescription') }}</p>
              <UFormField :label="$t('repositories.provider')" required>
                <USelectMenu
                  v-model="selectedProviderAccountId"
                  :items="providerOptions"
                  :loading="providerAccountsLoading"
                  :placeholder="$t('repositories.providerPlaceholder')"
                  class="w-full"
                  searchable
                  value-key="value"
                />
              </UFormField>
              <UAlert
                v-if="!providerAccountsLoading && !providerAccountsError && providerOptions.length === 0"
                color="warning"
                :title="$t('repositories.noEnabledProviders')"
              />
            </div>
          </template>

          <template #repository>
            <div class="space-y-4">
              <p class="text-sm text-muted">{{ $t('repositories.repositoryDescription') }}</p>
              <UAlert v-if="repositoriesError" color="error" :title="$t('repositories.repositoryLoadError')" />
              <UFormField :label="$t('repositories.repository')" required>
                <USelectMenu
                  v-model="selectedProviderRepositoryId"
                  :disabled="!selectedProviderAccountId"
                  :items="providerRepositoryOptions"
                  :loading="repositoriesLoading"
                  :placeholder="$t('repositories.repositoryPlaceholder')"
                  class="w-full"
                  searchable
                  value-key="value"
                />
              </UFormField>
              <UAlert
                v-if="!repositoriesLoading && !repositoriesError && selectedProviderAccountId && providerRepositoryOptions.length === 0"
                color="info"
                :title="$t('repositories.noAvailableRepositories')"
              />
            </div>
          </template>
        </UStepper>

        <div class="mt-6 flex justify-between border-t border-default pt-4">
          <UButton
            color="neutral"
            icon="i-lucide-arrow-left"
            :label="$t('repositories.back')"
            :disabled="addingRepository || !stepper?.hasPrev"
            variant="soft"
            @click="stepper?.prev()"
          />
          <UButton
            v-if="stepper?.hasNext"
            color="neutral"
            :disabled="!selectedProviderAccountId || repositoriesLoading"
            :label="$t('repositories.next')"
            trailing-icon="i-lucide-arrow-right"
            variant="soft"
            @click="stepper?.next()"
          />
          <UButton
            v-else
            :disabled="!selectedProviderRepositoryId || addingRepository"
            :label="$t('repositories.add')"
            :loading="addingRepository"
            @click="addRepository"
          />
        </div>
      </template>
    </UModal>
  </section>
</template>
