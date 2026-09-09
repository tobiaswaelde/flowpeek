<template>
  <UCard class="lg:col-span-2" :ui="{ body: 'space-y-4' }">
    <template #header>
      <div>
        <h2 class="font-semibold">{{ repository.owner }}/{{ repository.name }}</h2>
        <p class="text-sm text-muted">{{ $t('repositoryDetails.generalDescription') }}</p>
      </div>
    </template>

    <UAlert
      v-if="saveError"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      :title="$t('repositoryDetails.saveError')"
    />
    <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
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
import type { Repository } from '~/types/api/resources';

const props = defineProps<{
  repository: Repository;
}>();
const emit = defineEmits<{
  updated: [repository: Repository];
}>();

const api = useFlowpeekApi();
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

/** Persist a valid explicit retention override or restore the provider default. */
async function saveRetention(): Promise<void> {
  const parsedRetention = retentionDays.value.trim() === '' ? null : Number(retentionDays.value);
  if (!Number.isInteger(parsedRetention) || (parsedRetention !== null && parsedRetention < 1)) return;

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
