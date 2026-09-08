<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import type { Repository, RepositoryMembership, RepositoryRole, User, WorkflowFilter } from '~/types/api/resources';

definePageMeta({ fullWidth: true });

const { t } = useI18n();
const route = useRoute();
const api = useFlowpeekApi();
const repositoryId = computed(() => String(route.params.id));
const repository = ref<Repository>();
const workflowFilters = ref<WorkflowFilter[]>([]);
const memberships = ref<RepositoryMembership[]>([]);
const users = ref<User[]>([]);
const loading = ref(true);
const loadError = ref(false);
const savingRetention = ref(false);
const addingFilter = ref(false);
const addingMember = ref(false);
const operationError = ref(false);
const retentionDays = ref<string>('');
const filterForm = reactive<{ mode: WorkflowFilter['mode']; pattern: string }>({ mode: 'ALLOW', pattern: '' });
const membershipForm = reactive<{ role: RepositoryRole; userId: string | undefined }>({
  role: 'VIEWER',
  userId: undefined,
});
const filterModeOptions = computed(() => [
  { label: t('repositoryDetails.allow'), value: 'ALLOW' },
  { label: t('repositoryDetails.deny'), value: 'DENY' },
]);
const membershipRoleOptions = computed(() => [
  { label: t('roles.VIEWER'), value: 'VIEWER' },
  { label: t('roles.MANAGER'), value: 'MANAGER' },
]);
const availableUserOptions = computed(() => {
  const memberIds = new Set(memberships.value.map((membership) => membership.userId));
  return users.value
    .filter((user) => user.role !== 'SYSTEM_ADMIN' && !memberIds.has(user.id))
    .map((user) => ({ label: user.username, value: user.id }));
});

/** Load all repository configuration resources required by the detail screen. */
async function load(): Promise<void> {
  loading.value = true;
  loadError.value = false;
  try {
    const [repositoryResponse, filtersResponse, membershipsResponse, usersResponse] = await Promise.all([
      api.repositories.get(repositoryId.value),
      api.repositories.listWorkflowFilters(repositoryId.value),
      api.repositories.listMemberships(repositoryId.value),
      api.users.list(),
    ]);
    repository.value = repositoryResponse.data;
    retentionDays.value = repositoryResponse.data.workflowRunRetentionDays?.toString() ?? '';
    workflowFilters.value = filtersResponse.data;
    memberships.value = membershipsResponse.data;
    users.value = usersResponse.data.items;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

/** Persist the optional workflow-run retention override. */
async function saveRetention(): Promise<void> {
  if (!repository.value) return;

  const parsedRetention = retentionDays.value.trim() === '' ? null : Number(retentionDays.value);
  if (!Number.isInteger(parsedRetention) || (parsedRetention !== null && parsedRetention < 1)) return;

  savingRetention.value = true;
  operationError.value = false;
  try {
    await api.repositories.update(repository.value.id, {
      enabled: repository.value.enabled,
      workflowRunRetentionDays: parsedRetention,
    });
    repository.value = { ...repository.value, workflowRunRetentionDays: parsedRetention };
  } catch {
    operationError.value = true;
  } finally {
    savingRetention.value = false;
  }
}

/** Validate and add a workflow filter to the selected repository. */
async function addWorkflowFilter(): Promise<void> {
  if (!filterForm.pattern.trim()) return;

  addingFilter.value = true;
  operationError.value = false;
  try {
    const { data } = await api.repositories.createWorkflowFilter(repositoryId.value, {
      mode: filterForm.mode,
      pattern: filterForm.pattern,
    });
    workflowFilters.value = [...workflowFilters.value, data].sort((left, right) =>
      left.pattern.localeCompare(right.pattern),
    );
    filterForm.pattern = '';
  } catch {
    operationError.value = true;
  } finally {
    addingFilter.value = false;
  }
}

/** Remove one workflow filter from the selected repository. */
async function removeWorkflowFilter(filterId: string): Promise<void> {
  operationError.value = false;
  try {
    await api.repositories.deleteWorkflowFilter(repositoryId.value, filterId);
    workflowFilters.value = workflowFilters.value.filter((filter) => filter.id !== filterId);
  } catch {
    operationError.value = true;
  }
}

/** Assign the selected system user a repository-specific access role. */
async function addMember(): Promise<void> {
  if (!membershipForm.userId) return;

  addingMember.value = true;
  operationError.value = false;
  try {
    const { data } = await api.repositories.upsertMembership(repositoryId.value, membershipForm.userId, {
      role: membershipForm.role,
    });
    memberships.value = [...memberships.value, data].sort((left, right) =>
      left.user.username.localeCompare(right.user.username),
    );
    membershipForm.userId = undefined;
    membershipForm.role = 'VIEWER';
  } catch {
    operationError.value = true;
  } finally {
    addingMember.value = false;
  }
}

/** Update one existing repository member's role. */
async function updateMemberRole(membership: RepositoryMembership, role: RepositoryRole): Promise<void> {
  operationError.value = false;
  try {
    const { data } = await api.repositories.upsertMembership(repositoryId.value, membership.userId, { role });
    memberships.value = memberships.value.map((current) => (current.id === membership.id ? data : current));
  } catch {
    operationError.value = true;
  }
}

/** Remove explicit repository access for one user. */
async function removeMember(userId: string): Promise<void> {
  operationError.value = false;
  try {
    await api.repositories.deleteMembership(repositoryId.value, userId);
    memberships.value = memberships.value.filter((membership) => membership.userId !== userId);
  } catch {
    operationError.value = true;
  }
}

onMounted(() => void load());
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <UDashboardToolbar>
      <template #left>
        <UBreadcrumb
          :items="[
            { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
            { icon: 'i-lucide-git-branch', label: $t('layout.repositories'), to: '/admin/repositories' },
            { label: repository ? `${repository.owner}/${repository.name}` : $t('repositoryDetails.title') },
          ]"
        />
      </template>
    </UDashboardToolbar>

    <UAlert
      v-if="loadError"
      class="m-4"
      color="error"
      icon="i-lucide-circle-alert"
      :title="$t('repositoryDetails.loadError')"
      variant="subtle"
    />

    <div v-else class="grid gap-6 p-4 lg:grid-cols-2">
      <UAlert
        v-if="operationError"
        class="lg:col-span-2"
        color="error"
        icon="i-lucide-circle-alert"
        :title="$t('repositoryDetails.saveError')"
        variant="subtle"
      />
      <UCard class="lg:col-span-2" :ui="{ body: 'space-y-4' }">
        <template #header>
          <div>
            <h1 class="font-semibold">
              {{ repository ? `${repository.owner}/${repository.name}` : $t('repositoryDetails.title') }}
            </h1>
            <p class="text-sm text-muted">{{ $t('repositoryDetails.generalDescription') }}</p>
          </div>
        </template>

        <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <UFormField :label="$t('repositoryDetails.retention')" :help="$t('repositoryDetails.retentionHelp')">
            <UInput v-model="retentionDays" :disabled="loading" min="1" type="number" />
          </UFormField>
          <div class="flex items-end">
            <UButton :label="$t('repositoryDetails.save')" :loading="savingRetention" @click="saveRetention" />
          </div>
        </div>
      </UCard>

      <UCard :ui="{ body: 'space-y-4' }">
        <template #header>
          <div>
            <h2 class="font-semibold">{{ $t('repositoryDetails.workflowFilters') }}</h2>
            <p class="text-sm text-muted">{{ $t('repositoryDetails.workflowFiltersDescription') }}</p>
          </div>
        </template>

        <div class="flex flex-col gap-2 sm:flex-row">
          <USelect v-model="filterForm.mode" :items="filterModeOptions" class="sm:w-36" />
          <UInput
            v-model="filterForm.pattern"
            :placeholder="$t('repositoryDetails.filterPlaceholder')"
            class="flex-1"
          />
          <UButton
            :aria-label="$t('repositoryDetails.addFilter')"
            :disabled="!filterForm.pattern.trim()"
            icon="i-lucide-plus"
            :loading="addingFilter"
            @click="addWorkflowFilter"
          />
        </div>

        <UTable
          sticky
          :column-pinning="{ right: ['actions'] }"
          :columns="[
            { accessorKey: 'mode', header: $t('repositoryDetails.mode') },
            { accessorKey: 'pattern', header: $t('repositoryDetails.pattern') },
            { id: 'actions', header: $t('repositoryDetails.actions') },
          ]"
          :data="workflowFilters"
          :empty="$t('repositoryDetails.noWorkflowFilters')"
        >
          <template #mode-cell="{ row }">
            <UBadge :color="row.original.mode === 'DENY' ? 'error' : 'success'" variant="subtle">
              {{ row.original.mode === 'DENY' ? $t('repositoryDetails.deny') : $t('repositoryDetails.allow') }}
            </UBadge>
          </template>
          <template #actions-header="{ column }">
            <span class="flex justify-end">{{ column.columnDef.header }}</span>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end">
              <UButton
                :aria-label="$t('repositoryDetails.delete')"
                color="error"
                icon="i-lucide-trash-2"
                variant="ghost"
                @click="removeWorkflowFilter(row.original.id)"
              />
            </div>
          </template>
        </UTable>
      </UCard>

      <UCard :ui="{ body: 'space-y-4' }">
        <template #header>
          <div>
            <h2 class="font-semibold">{{ $t('repositoryDetails.members') }}</h2>
            <p class="text-sm text-muted">{{ $t('repositoryDetails.membersDescription') }}</p>
          </div>
        </template>

        <div class="flex flex-col gap-2 sm:flex-row">
          <USelectMenu
            v-model="membershipForm.userId"
            :items="availableUserOptions"
            :placeholder="$t('repositoryDetails.memberPlaceholder')"
            class="flex-1"
            searchable
            value-key="value"
          />
          <USelect v-model="membershipForm.role" :items="membershipRoleOptions" class="sm:w-48" />
          <UButton
            :aria-label="$t('repositoryDetails.addMember')"
            :disabled="!membershipForm.userId"
            icon="i-lucide-user-plus"
            :loading="addingMember"
            @click="addMember"
          />
        </div>

        <UTable
          sticky
          :column-pinning="{ right: ['actions'] }"
          :columns="[
            { accessorKey: 'user.username', header: $t('repositoryDetails.user') },
            { accessorKey: 'role', header: $t('repositoryDetails.role') },
            { id: 'actions', header: $t('repositoryDetails.actions') },
          ]"
          :data="memberships"
          :empty="$t('repositoryDetails.noMembers')"
        >
          <template #role-cell="{ row }">
            <USelect
              :items="membershipRoleOptions"
              :model-value="row.original.role"
              class="w-44"
              @update:model-value="updateMemberRole(row.original, $event as RepositoryRole)"
            />
          </template>
          <template #actions-header="{ column }">
            <span class="flex justify-end">{{ column.columnDef.header }}</span>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end">
              <UButton
                :aria-label="$t('repositoryDetails.removeMember')"
                color="error"
                icon="i-lucide-user-minus"
                variant="ghost"
                @click="removeMember(row.original.userId)"
              />
            </div>
          </template>
        </UTable>
      </UCard>
    </div>
  </section>
</template>
