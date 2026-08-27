<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import TrendChart from '~/components/modules/dashboard/trend-chart.vue';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import type { DashboardWorkflowRun, WorkflowRunTrendBucket } from '~/types/api/resources';

definePageMeta({ title: 'Dashboard' });

const { t } = useI18n();
const api = useFlowpeekApi();
const failures = ref<DashboardWorkflowRun[]>([]);
const latestRuns = ref<DashboardWorkflowRun[]>([]);
const trend = ref<WorkflowRunTrendBucket[]>([]);
const isLoading = ref(true);
const error = ref(false);
const range = ref<'7d' | '30d' | '90d'>('30d');

const rangeOptions = computed(() => [
  { label: t('dashboard.last7Days'), value: '7d' },
  { label: t('dashboard.last30Days'), value: '30d' },
  { label: t('dashboard.last90Days'), value: '90d' },
]);

/** Format an optional workflow duration for compact table display. */
function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return '—';
  const seconds = Math.round(durationMs / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

/** Format an API timestamp in the user's browser locale. */
function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

/** Map normalized workflow states to Nuxt UI badge colors. */
function statusColor(status: DashboardWorkflowRun['status']): 'error' | 'info' | 'neutral' | 'success' | 'warning' {
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILED') return 'error';
  if (status === 'RUNNING') return 'info';
  if (status === 'QUEUED') return 'warning';
  return 'neutral';
}

/** Fetch the dashboard resources visible to the current user. */
async function loadDashboard(): Promise<void> {
  isLoading.value = true;
  error.value = false;
  const days = Number(range.value.replace('d', ''));
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  try {
    const [failureResponse, latestResponse, trendResponse] = await Promise.all([
      api.dashboard.getFailures(),
      api.dashboard.getLatestRuns(),
      api.dashboard.getTrend({ bucket: days <= 7 ? 'hour' : 'day', from: from.toISOString(), to: to.toISOString() }),
    ]);
    failures.value = failureResponse.data;
    latestRuns.value = latestResponse.data;
    trend.value = trendResponse.data;
  } catch {
    error.value = true;
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<template>
  <section class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">{{ $t('dashboard.title') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t('dashboard.description') }}</p>
      </div>
      <UButton
        :label="$t('dashboard.refresh')"
        icon="i-lucide-refresh-cw"
        :loading="isLoading"
        variant="soft"
        @click="loadDashboard"
      />
    </div>

    <UAlert v-if="error" color="error" :description="$t('dashboard.loadError')" icon="i-lucide-circle-alert" />

    <div>
      <h2 class="mb-3 text-lg font-semibold">{{ $t('dashboard.failingWorkflows') }}</h2>
      <div v-if="failures.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UCard v-for="run in failures" :key="run.id">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium">{{ run.workflowName }}</p>
              <p class="text-sm text-muted">{{ run.repository.owner }}/{{ run.repository.name }}</p>
            </div>
            <UBadge :color="statusColor(run.status)">{{ run.status }}</UBadge>
          </div>
          <UButton class="mt-4" :label="$t('dashboard.openProvider')" :to="run.url" target="_blank" variant="link" />
        </UCard>
      </div>
      <UCard v-else
        ><p class="py-5 text-center text-sm text-muted">{{ $t('dashboard.noFailures') }}</p></UCard
      >
    </div>

    <div class="grid gap-6 xl:grid-cols-5">
      <UCard class="xl:col-span-3"
        ><template #header
          ><h2 class="font-semibold">{{ $t('dashboard.latestRuns') }}</h2></template
        >
        <div v-if="latestRuns.length" class="overflow-x-auto">
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
              <tr v-for="run in latestRuns" :key="run.id" class="border-b border-default last:border-0">
                <td class="py-3">
                  <UButton :label="run.workflowName" :to="run.url" target="_blank" variant="link" />
                  <p class="text-xs text-muted">{{ run.repository.owner }}/{{ run.repository.name }}</p>
                </td>
                <td class="py-3">
                  <UBadge :color="statusColor(run.status)">{{ run.status }}</UBadge>
                </td>
                <td class="py-3">{{ formatDuration(run.durationMs) }}</td>
                <td class="py-3 whitespace-nowrap">{{ formatTimestamp(run.providerCreatedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="py-12 text-center text-sm text-muted">{{ $t('dashboard.noRuns') }}</p>
      </UCard>
      <UCard class="xl:col-span-2"
        ><template #header
          ><div class="flex items-center justify-between gap-3">
            <h2 class="font-semibold">{{ $t('dashboard.trend') }}</h2>
            <USelect
              v-model="range"
              :items="rangeOptions"
              class="w-36"
              @update:model-value="loadDashboard"
            /></div></template
        ><TrendChart :buckets="trend"
      /></UCard>
    </div>
  </section>
</template>
