<template>
  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" :aria-label="$t('dashboard.summary')">
    <UCard v-for="metric in metrics" :key="metric.key" :ui="{ body: 'space-y-3' }">
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">{{ metric.label }}</p>
        <UIcon class="size-4 text-muted" :name="metric.icon" />
      </div>
      <USkeleton v-if="loading && !summary" class="h-8 w-24" />
      <p v-else class="text-2xl font-semibold tabular-nums">{{ metric.value }}</p>
      <p class="text-xs text-muted">{{ metric.context }}</p>
    </UCard>
  </section>
</template>

<script setup lang="ts">
import type { DashboardSummary } from '~/types/api/resources';

const props = defineProps<{
  failingWorkflowCount: number;
  loading: boolean;
  summary: DashboardSummary | null;
}>();

const { locale, t } = useI18n();

const metrics = computed(() => {
  const summary = props.summary;
  const activeCount = (summary?.queuedCount ?? 0) + (summary?.runningCount ?? 0);
  return [
    {
      context: t('dashboard.completedRuns', { count: formatNumber(summary?.completedCount ?? 0) }),
      icon: 'i-lucide-circle-check-big',
      key: 'success-rate',
      label: t('dashboard.successRate'),
      value: summary ? `${formatNumber(summary.successRate, 1)} %` : '—',
    },
    {
      context: t('dashboard.failedRuns', { count: formatNumber(summary?.statuses.failed ?? 0) }),
      icon: 'i-lucide-circle-alert',
      key: 'failing-workflows',
      label: t('dashboard.failingNow'),
      value: formatNumber(props.failingWorkflowCount),
    },
    {
      context: t('dashboard.completedDurationContext'),
      icon: 'i-lucide-timer',
      key: 'median-duration',
      label: t('dashboard.medianDuration'),
      value: summary ? formatDuration(summary.medianDurationMs) : '—',
    },
    {
      context: t('dashboard.activeRunsContext', {
        queued: formatNumber(summary?.queuedCount ?? 0),
        running: formatNumber(summary?.runningCount ?? 0),
      }),
      icon: 'i-lucide-activity',
      key: 'active-runs',
      label: t('dashboard.activeRuns'),
      value: summary ? formatNumber(activeCount) : '—',
    },
  ];
});

/** Format one dashboard number using the active interface locale. */
function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(locale.value, { maximumFractionDigits }).format(value);
}

/** Format a median duration as a compact minutes-and-seconds value. */
function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return t('dashboard.durationUnknown');
  const seconds = Math.round(durationMs / 1_000);
  return t('dashboard.durationMinutesSeconds', {
    minutes: formatNumber(Math.floor(seconds / 60)),
    seconds: formatNumber(seconds % 60),
  });
}
</script>
