<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold">{{ $t('dashboard.latestRuns') }}</h2>
    </template>

    <div v-if="runs.length" class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-default text-muted">
          <tr>
            <th class="pb-3">{{ $t('dashboard.workflow') }}</th>
            <th class="pb-3">{{ $t('dashboard.status') }}</th>
            <th class="pb-3">{{ $t('dashboard.duration') }}</th>
            <th class="pb-3">{{ $t('dashboard.createdAt') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="run in runs" :key="run.id" class="border-b border-default last:border-0">
            <td class="py-3">
              <UButton target="_blank" variant="link" :label="run.workflowName" :to="run.url" />
              <p class="text-xs text-muted">{{ run.repository.owner }}/{{ run.repository.name }}</p>
            </td>
            <td class="py-3"><EnumsWorkflowRunStatusBadge :status="run.status" /></td>
            <td class="py-3">{{ formatDuration(run.durationMs) }}</td>
            <td class="py-3 whitespace-nowrap">{{ formatTimestamp(run.providerCreatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="py-12 text-center text-sm text-muted">{{ $t('dashboard.noRuns') }}</p>
  </UCard>
</template>

<script setup lang="ts">
import type { DashboardWorkflowRun } from '~/types/api/resources';

const { locale, t } = useI18n();

defineProps<{
  runs: DashboardWorkflowRun[];
}>();

/** Format an optional workflow duration for compact table display. */
function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return t('dashboard.durationUnknown');
  const seconds = Math.round(durationMs / 1000);
  const formatter = new Intl.NumberFormat(locale.value);
  return seconds >= 60
    ? t('dashboard.durationMinutesSeconds', {
        minutes: formatter.format(Math.floor(seconds / 60)),
        seconds: formatter.format(seconds % 60),
      })
    : t('dashboard.durationSeconds', { seconds: formatter.format(seconds) });
}

/** Format an API timestamp in the user's browser locale. */
function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}
</script>
