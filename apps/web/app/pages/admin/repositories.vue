<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import type { Repository } from '~/types/api/resources';
const api = useFlowpeekApi();
const repositories = ref<Repository[]>([]);
async function load(): Promise<void> {
  repositories.value = (await api.repositories.list()).data;
}
async function toggle(repository: Repository): Promise<void> {
  await api.repositories.update(repository.id, {
    enabled: !repository.enabled,
    workflowRunRetentionDays: repository.workflowRunRetentionDays,
  });
  await load();
}
onMounted(load);
</script>
<template>
  <section class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">Repositories</h1>
      <p class="text-sm text-muted">Tracked repository workflow settings.</p>
    </div>
    <UCard v-for="repository in repositories" :key="repository.id"
      ><div class="flex justify-between">
        <div>
          <a class="font-medium" :href="repository.url" target="_blank">{{ repository.owner }}/{{ repository.name }}</a>
          <p class="text-sm text-muted">Retention: {{ repository.workflowRunRetentionDays ?? 'default' }} days</p>
        </div>
        <UButton :label="repository.enabled ? 'Disable' : 'Enable'" @click="toggle(repository)" /></div
    ></UCard>
  </section>
</template>
