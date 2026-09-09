<template>
  <UCard :ui="{ body: 'space-y-4' }">
    <template #header>
      <div>
        <h2 class="font-semibold">{{ $t('repositoryDetails.members') }}</h2>
        <p class="text-sm text-muted">{{ $t('repositoryDetails.membersDescription') }}</p>
      </div>
    </template>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      :title="$t('repositoryDetails.saveError')"
    />
    <div class="flex flex-col gap-2 sm:flex-row">
      <USelectMenu
        v-model="form.userId"
        class="flex-1"
        value-key="value"
        :items="availableUserOptions"
        :placeholder="$t('repositoryDetails.memberPlaceholder')"
        searchable
      />
      <USelect v-model="form.role" class="sm:w-48" :items="membershipRoleOptions" />
      <UButton
        icon="i-lucide-user-plus"
        :aria-label="$t('repositoryDetails.addMember')"
        :disabled="!form.userId"
        :loading="adding"
        @click="addMember"
      />
    </div>

    <UTable
      sticky
      :column-pinning="{ right: ['actions'] }"
      :columns="columns"
      :data="memberships"
      :empty="$t('repositoryDetails.noMembers')"
      :loading="loading"
    >
      <template #role-cell="{ row }">
        <USelect
          class="w-44"
          :items="membershipRoleOptions"
          :disabled="isMembershipPending(row.original.userId)"
          :loading="isPending(memberActionKey('role', row.original.userId))"
          :model-value="row.original.role"
          @update:model-value="updateMemberRole(row.original, $event as RepositoryRole)"
        />
      </template>
      <template #actions-header="{ column }">
        <span class="flex justify-end">{{ column.columnDef.header }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UButton
            color="error"
            icon="i-lucide-user-minus"
            variant="ghost"
            :aria-label="$t('repositoryDetails.removeMember')"
            :disabled="isMembershipPending(row.original.userId)"
            :loading="isPending(memberActionKey('remove', row.original.userId))"
            @click="removeMember(row.original.userId)"
          />
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import { usePendingActions } from '~/composables/use-pending-actions';
import type { RepositoryMembership, RepositoryRole, User } from '~/types/api/resources';

const props = defineProps<{
  repositoryId: string;
}>();

const { t } = useI18n();
const api = useFlowpeekApi();
const { isPending, run: runPendingAction } = usePendingActions();
const memberships = ref<RepositoryMembership[]>([]);
const users = ref<User[]>([]);
const loading = ref(true);
const adding = ref(false);
const error = ref(false);
const form = reactive<{ role: RepositoryRole; userId: string | undefined }>({ role: 'VIEWER', userId: undefined });
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
const columns = computed(() => [
  { accessorKey: 'user.username', header: t('repositoryDetails.user') },
  { accessorKey: 'role', header: t('repositoryDetails.role') },
  { id: 'actions', header: t('repositoryDetails.actions') },
]);

/** Build a unique pending-state key for one membership action. */
function memberActionKey(action: 'remove' | 'role', userId: string): string {
  return `${action}:${userId}`;
}

/** Return whether a membership mutation is active for a user row. */
function isMembershipPending(userId: string): boolean {
  return isPending(memberActionKey('remove', userId)) || isPending(memberActionKey('role', userId));
}

/** Load the user pool and explicit access records required by the member table. */
async function load(): Promise<void> {
  loading.value = true;
  error.value = false;
  try {
    const [membershipsResponse, usersResponse] = await Promise.all([
      api.repositories.listMemberships(props.repositoryId),
      api.users.list(),
    ]);
    memberships.value = membershipsResponse.data;
    users.value = usersResponse.data.items;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

/** Grant the selected system user explicit repository access. */
async function addMember(): Promise<void> {
  if (!form.userId) return;

  adding.value = true;
  error.value = false;
  try {
    const { data } = await api.repositories.upsertMembership(props.repositoryId, form.userId, { role: form.role });
    memberships.value = [...memberships.value, data].sort((left, right) =>
      left.user.username.localeCompare(right.user.username),
    );
    form.userId = undefined;
    form.role = 'VIEWER';
  } catch {
    error.value = true;
  } finally {
    adding.value = false;
  }
}

/** Change a repository member's explicit access role. */
async function updateMemberRole(membership: RepositoryMembership, role: RepositoryRole): Promise<void> {
  await runPendingAction(memberActionKey('role', membership.userId), async () => {
    error.value = false;
    try {
      const { data } = await api.repositories.upsertMembership(props.repositoryId, membership.userId, { role });
      memberships.value = memberships.value.map((current) => (current.id === membership.id ? data : current));
    } catch {
      error.value = true;
    }
  });
}

/** Revoke explicit repository access from one user. */
async function removeMember(userId: string): Promise<void> {
  await runPendingAction(memberActionKey('remove', userId), async () => {
    error.value = false;
    try {
      await api.repositories.deleteMembership(props.repositoryId, userId);
      memberships.value = memberships.value.filter((membership) => membership.userId !== userId);
    } catch {
      error.value = true;
    }
  });
}

onMounted(() => void load());
</script>
