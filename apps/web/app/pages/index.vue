<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">{{ $t('dashboard.title') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t('dashboard.description') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <USelect
          v-model="range"
          class="w-40"
          :disabled="isHistoricalLoading"
          :items="rangeOptions"
          :loading="isHistoricalLoading"
          :aria-label="$t('dashboard.period')"
          @update:model-value="loadHistoricalDashboard"
        />
        <UButton
          color="neutral"
          icon="i-lucide-refresh-cw"
          variant="soft"
          :label="$t('dashboard.refresh')"
          :loading="isLoading"
          @click="loadDashboard"
        />
      </div>
    </div>

    <UAlert
      v-if="hasError"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      :description="$t('dashboard.partialLoadError')"
      :title="$t('dashboard.loadErrorTitle')"
    />

    <ModulesDashboardSummaryCards :failing-workflow-count="failures.length" :loading="isLoading" :summary="summary" />

    <div class="grid gap-6 xl:grid-cols-5">
      <UCard class="xl:col-span-3">
        <template #header>
          <div>
            <h2 class="font-semibold">{{ $t('dashboard.trend') }}</h2>
            <p class="mt-1 text-xs text-muted">{{ $t('dashboard.trendDescription') }}</p>
          </div>
        </template>
        <TrendChart :buckets="trend" :loading="isHistoricalLoading" />
      </UCard>
      <ModulesDashboardStatusDistribution class="xl:col-span-2" :loading="isHistoricalLoading" :summary="summary" />
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <ModulesDashboardRepositoryHealth :loading="isHistoricalLoading" :repositories="repositoryHealth" />
      <ModulesDashboardFailingWorkflows :loading="isCurrentLoading" :runs="failures" />
    </div>

    <ModulesDashboardLatestRuns :loading="isCurrentLoading" :runs="latestRuns" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';

import TrendChart from '~/components/modules/dashboard/trend-chart.vue';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import type {
  DashboardPeriodQuery,
  DashboardSummary,
  DashboardWorkflowRun,
  RepositoryHealth,
  WorkflowRunTrendBucket,
} from '~/types/api/resources';

const { t } = useI18n();
const api = useFlowpeekApi();
const failures = ref<DashboardWorkflowRun[]>([]);
const latestRuns = ref<DashboardWorkflowRun[]>([]);
const repositoryHealth = ref<RepositoryHealth[]>([]);
const summary = ref<DashboardSummary | null>(null);
const trend = ref<WorkflowRunTrendBucket[]>([]);
const isCurrentLoading = ref(true);
const isHistoricalLoading = ref(true);
const errors = reactive({ failures: false, latestRuns: false, repositories: false, summary: false, trend: false });
const range = ref<'7d' | '30d' | '90d'>('30d');
let historicalRequestId = 0;

useHead({ title: computed(() => t('dashboard.title')) });

const isLoading = computed(() => isCurrentLoading.value || isHistoricalLoading.value);
const hasError = computed(() => Object.values(errors).some(Boolean));
const rangeOptions = computed(() => [
  { label: t('dashboard.last7Days'), value: '7d' },
  { label: t('dashboard.last30Days'), value: '30d' },
  { label: t('dashboard.last90Days'), value: '90d' },
]);

/** Fetch current and period-based dashboard resources visible to the current user. */
async function loadDashboard(): Promise<void> {
  await Promise.all([loadCurrentDashboard(), loadHistoricalDashboard()]);
}

/** Fetch current failed workflows and the latest visible runs independently. */
async function loadCurrentDashboard(): Promise<void> {
  isCurrentLoading.value = true;
  const [failureResult, latestResult] = await Promise.allSettled([
    api.dashboard.getFailures(),
    api.dashboard.getLatestRuns(),
  ]);
  errors.failures = failureResult.status === 'rejected';
  errors.latestRuns = latestResult.status === 'rejected';
  if (failureResult.status === 'fulfilled') failures.value = failureResult.value.data;
  if (latestResult.status === 'fulfilled') latestRuns.value = latestResult.value.data;
  isCurrentLoading.value = false;
}

/** Fetch every historical widget for the selected period and discard stale responses. */
async function loadHistoricalDashboard(): Promise<void> {
  const requestId = ++historicalRequestId;
  isHistoricalLoading.value = true;
  const days = Number(range.value.replace('d', ''));
  const query = createPeriodQuery(days);
  const [repositoryResult, summaryResult, trendResult] = await Promise.allSettled([
    api.dashboard.getRepositoryHealth(query),
    api.dashboard.getSummary(query),
    api.dashboard.getTrend({
      ...query,
      bucket: days <= 7 ? 'hour' : days <= 30 ? 'day' : 'week',
    }),
  ]);
  if (requestId !== historicalRequestId) return;

  errors.repositories = repositoryResult.status === 'rejected';
  errors.summary = summaryResult.status === 'rejected';
  errors.trend = trendResult.status === 'rejected';
  if (repositoryResult.status === 'fulfilled') repositoryHealth.value = repositoryResult.value.data;
  if (summaryResult.status === 'fulfilled') summary.value = summaryResult.value.data;
  if (trendResult.status === 'fulfilled') trend.value = trendResult.value.data;
  isHistoricalLoading.value = false;
}

/** Build one inclusive UTC query ending at the current browser time. */
function createPeriodQuery(days: number): DashboardPeriodQuery {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

onMounted(() => void loadDashboard());
</script>
