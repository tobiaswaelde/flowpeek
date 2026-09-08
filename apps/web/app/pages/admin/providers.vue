<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

import { FilterFieldType, type FilterField, type SortingField } from '@querry-kit/nuxt-ui/types';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import { useTable } from '~/composables/api/table';
import { useProviderType } from '~/composables/enums/provider-type';
import { useUnsavedChangesGuard } from '~/composables/use-unsaved-changes-guard';
import {
  providerOAuthFormSchema,
  providerPatFormSchema,
  providerTypes,
  type ProviderAccount,
  type ProviderType,
} from '~/types/api/resources';
import type { ColumnDefinition } from '~/types/table';

type AuthenticationMethod = 'OAUTH' | 'PAT';
type ProviderAccountRow = ProviderAccount & Record<string, unknown>;
type ProviderTableColumn = ColumnDefinition<ProviderAccountRow> & { header: string; id: string };

definePageMeta({ fullWidth: true });

const { t } = useI18n();
const api = useFlowpeekApi();
const route = useRoute();
const dialogOpen = ref(false);
const submitting = ref(false);
const connectionError = ref(false);
const oauthProviderTypes = ref<ProviderType[]>([]);
const authenticationMethod = ref<AuthenticationMethod>('PAT');
const form = reactive({ accessToken: '', baseUrl: '', displayName: '', providerType: 'GITHUB' as ProviderType });
const { reset: resetDirtyState } = useUnsavedChangesGuard(form);
const oauthStatus = computed(() => route.query.oauth);
const oauthAvailable = computed(() => oauthProviderTypes.value.includes(form.providerType));
const usePat = computed(() => !oauthAvailable.value || authenticationMethod.value === 'PAT');
const requiresBaseUrl = computed(() => form.providerType === 'GITEA');
const providerFormSchema = computed(() => (usePat.value ? providerPatFormSchema : providerOAuthFormSchema));
const { getLabel: getProviderTypeLabel } = useProviderType();
const providerTypeOptions = computed(() =>
  providerTypes.map((providerType) => ({ label: getProviderTypeLabel(providerType), value: providerType })),
);
const authenticationOptions = computed(() => [
  { icon: 'i-tabler-key', label: t('providers.authenticationOAuth'), value: 'OAUTH' },
  { icon: 'i-tabler-password', label: t('providers.authenticationPat'), value: 'PAT' },
]);
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
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastSyncAt));
}

/** Reset and open the dialog used to add a provider account. */
function openAddDialog(): void {
  Object.assign(form, { accessToken: '', baseUrl: '', displayName: '', providerType: 'GITHUB' });
  authenticationMethod.value = oauthProviderTypes.value.includes('GITHUB') ? 'OAUTH' : 'PAT';
  connectionError.value = false;
  resetDirtyState();
  dialogOpen.value = true;
}

defineShortcuts({
  shift_n: () => openAddDialog(),
});

/** Load installed OAuth capabilities independently of the paginated table query. */
async function loadAuthenticationOptions(): Promise<void> {
  const { data } = await api.providerAccounts.authenticationOptions();
  oauthProviderTypes.value = data.oauthProviderTypes;
}

/** Validate and persist a PAT account, or begin the provider-controlled OAuth flow. */
async function addProvider(): Promise<void> {
  submitting.value = true;
  connectionError.value = false;
  try {
    if (usePat.value) {
      await api.providerAccounts.create({
        ...form,
        baseUrl: form.baseUrl.trim() || undefined,
      });
      dialogOpen.value = false;
      resetDirtyState();
      page.value = 1;
      await providerTable.refresh();
      return;
    }

    const { data } = await api.providerAccounts.authorize({
      baseUrl: form.baseUrl.trim() || undefined,
      displayName: form.displayName,
      providerType: form.providerType,
    });
    resetDirtyState();
    window.location.assign(data.authorizationUrl);
  } catch {
    connectionError.value = true;
  } finally {
    submitting.value = false;
  }
}

/** Remove a provider account and refresh the current Query Kit page. */
async function remove(id: string): Promise<void> {
  await api.providerAccounts.delete(id);
  await providerTable.refresh();
}

/** Enable or disable a provider account without changing its stored credentials. */
async function toggle(provider: ProviderAccount): Promise<void> {
  await api.providerAccounts.update(provider.id, { enabled: !provider.enabled });
  await providerTable.refresh();
}

onMounted(() => void Promise.all([providerTable.initialize(), loadAuthenticationOptions()]));
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <UAlert v-if="oauthStatus === 'connected'" color="success" :title="$t('providers.oauthConnected')" />
    <UAlert v-else-if="oauthStatus === 'failed'" color="error" :title="$t('providers.oauthError')" />

    <div class="flex min-h-0 flex-1 flex-col">
      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb
            :items="[
              { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
              { icon: 'i-lucide-plug-zap', label: $t('layout.providers') },
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
          <UButton :label="$t('providers.add')" icon="i-lucide-plus" @click="openAddDialog" />
        </template>
      </UDashboardToolbar>

      <UAlert v-if="tableError" class="m-4" color="error" :title="$t('providers.loadError')" />
      <UTable
        sticky
        class="min-h-0 flex-1"
        :columns="columns"
        :data="items"
        :empty="$t('providers.empty')"
        :loading="loading"
        :ui="{
          th: 'first:pl-6 bg-neutral-100 dark:bg-neutral-950/20',
          td: 'first:pl-6',
        }"
      >
        <template #providerType-cell="{ row }">
          <EnumsProviderTypeBadge :value="row.original.providerType" variant="subtle" />
        </template>
        <template #baseUrl-cell="{ row }">
          <span class="break-all text-sm text-muted">{{ row.original.baseUrl ?? $t('providers.defaultUrl') }}</span>
        </template>
        <template #enabled-cell="{ row }">
          <UBadge :color="row.original.enabled ? 'success' : 'neutral'" variant="subtle">
            {{ row.original.enabled ? $t('providers.enabled') : $t('providers.disabled') }}
          </UBadge>
        </template>
        <template #lastSyncAt-cell="{ row }">
          <span class="whitespace-nowrap text-sm text-muted">{{ formatLastSync(row.original.lastSyncAt) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton
              :aria-label="row.original.enabled ? $t('providers.disable') : $t('providers.enable')"
              :icon="row.original.enabled ? 'i-lucide-pause' : 'i-lucide-play'"
              color="neutral"
              size="sm"
              variant="ghost"
              @click="toggle(row.original)"
            />
            <UButton
              :aria-label="$t('providers.delete')"
              color="error"
              icon="i-lucide-trash-2"
              size="sm"
              variant="ghost"
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

    <UModal
      v-model:open="dialogOpen"
      :description="$t('providers.connectDescription')"
      :dismissible="!submitting"
      :title="$t('providers.addDialogTitle')"
    >
      <template #body>
        <UAlert
          v-if="connectionError"
          color="error"
          :title="$t(usePat ? 'providers.credentialsError' : 'providers.oauthError')"
        />
        <UForm :schema="providerFormSchema" :state="form" class="mt-4 space-y-6" @submit="addProvider">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="$t('providers.name')" name="displayName">
              <UInput v-model="form.displayName" :placeholder="$t('providers.namePlaceholder')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('providers.type')" name="providerType">
              <EnumsProviderTypeSelect
                v-model="form.providerType"
                :placeholder="$t('providers.typePlaceholder')"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField v-if="oauthAvailable" :label="$t('providers.authentication')">
              <USelect v-model="authenticationMethod" :items="authenticationOptions" class="w-full" />
            </UFormField>
            <UFormField v-if="usePat" :label="$t('providers.accessToken')" name="accessToken">
              <UInput
                v-model="form.accessToken"
                :placeholder="$t('providers.accessTokenPlaceholder')"
                autocomplete="off"
                class="w-full"
                type="password"
              />
            </UFormField>
            <UFormField :label="$t('providers.baseUrl')" name="baseUrl" :required="requiresBaseUrl">
              <UInput
                v-model="form.baseUrl"
                :placeholder="$t('providers.baseUrlPlaceholder')"
                autocomplete="url"
                class="w-full"
                inputmode="url"
                type="url"
              />
            </UFormField>
          </div>

          <div class="flex justify-end border-t border-default pt-4">
            <UButton
              :disabled="submitting"
              :label="usePat ? $t('providers.addAndVerify') : $t('providers.connect')"
              :loading="submitting"
              type="submit"
            />
          </div>
        </UForm>
      </template>
    </UModal>
  </section>
</template>
