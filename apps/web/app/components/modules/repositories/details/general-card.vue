<template>
  <UCard class="lg:col-span-2" :ui="{ body: 'space-y-4' }">
    <template #header>
      <div>
        <h2 class="font-semibold">{{ repository.owner }}/{{ repository.name }}</h2>
        <p class="text-sm text-muted">
          {{ editable ? $t('repositoryDetails.generalDescription') : $t('repositories.description') }}
        </p>
      </div>
    </template>

    <dl v-if="!editable" class="grid gap-4 sm:grid-cols-3">
      <div>
        <dt class="text-xs font-medium uppercase tracking-wide text-muted">{{ $t('repositories.columns.status') }}</dt>
        <dd class="mt-1">
          <UBadge variant="subtle" :color="repository.enabled ? 'success' : 'neutral'">
            {{ repository.enabled ? $t('repositories.enabled') : $t('repositories.disabled') }}
          </UBadge>
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium uppercase tracking-wide text-muted">
          {{ $t('repositories.columns.retention') }}
        </dt>
        <dd class="mt-1 text-sm">
          {{ repository.workflowRunRetentionDays ?? $t('repositories.default') }}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium uppercase tracking-wide text-muted">
          {{ $t('repositories.columns.lastSync') }}
        </dt>
        <dd class="mt-1 text-sm">{{ formatLastSync(repository.lastSyncAt) }}</dd>
      </div>
    </dl>

    <UAlert
      v-if="saveError"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      :title="$t('repositoryDetails.saveError')"
    />
    <div v-if="editable" class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <UFormField :help="$t('repositoryDetails.retentionHelp')" :label="$t('repositoryDetails.retention')">
        <UInput v-model="retentionDays" min="1" type="number" :disabled="saving" />
      </UFormField>
      <div class="flex items-end">
        <UButton :label="$t('repositoryDetails.save')" :loading="saving" @click="saveRetention" />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import { useDateTime } from '~/composables/use-date-time';
import type { Repository } from '~/types/api/resources';

const props = defineProps<{
  editable: boolean;
  repository: Repository;
}>();
const emit = defineEmits<{
  updated: [repository: Repository];
}>();

const { t } = useI18n();
const api = useFlowpeekApi();
const { formatDateTime } = useDateTime();
const retentionDays = ref('');
const saving = ref(false);
const saveError = ref(false);

watch(
  () => props.repository.workflowRunRetentionDays,
  (value) => {
    retentionDays.value = value?.toString() ?? '';
  },
  { immediate: true },
);

/** Format the last successful synchronization using the active interface locale. */
function formatLastSync(lastSyncAt: string | null): string {
  return lastSyncAt ? formatDateTime(lastSyncAt) : t('repositories.neverSynced');
}

/** Persist a valid explicit retention override or restore the provider default. */
async function saveRetention(): Promise<void> {
  const retentionInput = String(retentionDays.value).trim();
  const parsedRetention = retentionInput === '' ? null : Number(retentionInput);
  if (parsedRetention !== null && (!Number.isInteger(parsedRetention) || parsedRetention < 1)) return;

  saving.value = true;
  saveError.value = false;
  try {
    await api.repositories.update(props.repository.id, {
      enabled: props.repository.enabled,
      workflowRunRetentionDays: parsedRetention,
    });
    emit('updated', { ...props.repository, workflowRunRetentionDays: parsedRetention });
  } catch {
    saveError.value = true;
  } finally {
    saving.value = false;
  }
}
</script>
