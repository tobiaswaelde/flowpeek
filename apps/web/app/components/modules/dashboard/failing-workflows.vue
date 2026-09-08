<template>
  <section>
    <h2 class="mb-3 text-lg font-semibold">{{ $t('dashboard.failingWorkflows') }}</h2>
    <div v-if="runs.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UCard v-for="run in runs" :key="run.id">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-medium">{{ run.workflowName }}</p>
            <p class="text-sm text-muted">{{ run.repository.owner }}/{{ run.repository.name }}</p>
          </div>
          <EnumsWorkflowRunStatusBadge :status="run.status" />
        </div>
        <UButton class="mt-4" target="_blank" variant="link" :label="$t('dashboard.openProvider')" :to="run.url" />
      </UCard>
    </div>
    <UCard v-else>
      <p class="py-5 text-center text-sm text-muted">{{ $t('dashboard.noFailures') }}</p>
    </UCard>
  </section>
</template>

<script setup lang="ts">
import type { DashboardWorkflowRun } from '~/types/api/resources';

defineProps<{
  runs: DashboardWorkflowRun[];
}>();
</script>
