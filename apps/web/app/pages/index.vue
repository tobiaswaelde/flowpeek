<template>
  <section class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">{{ $t('dashboard.title') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t('dashboard.description') }}</p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        variant="soft"
        :label="$t('dashboard.refresh')"
        :loading="isLoading"
        @click="loadDashboard"
      />
    </div>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      :description="$t('dashboard.loadError')"
    />

    <ModulesDashboardFailingWorkflows :runs="failures" />

    <div class="grid gap-6 xl:grid-cols-5">
      <ModulesDashboardLatestRuns class="xl:col-span-3" :runs="latestRuns" />
      <UCard class="xl:col-span-2">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-semibold">{{ $t('dashboard.trend') }}</h2>
            <USelect v-model="range" class="w-36" :items="rangeOptions" @update:model-value="loadDashboard" />
          </div>
        </template>
        <TrendChart :buckets="trend" />
      </UCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import TrendChart from '~/components/modules/dashboard/trend-chart.vue';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import type { DashboardWorkflowRun, WorkflowRunTrendBucket } from '~/types/api/resources';

const { t } = useI18n();
const api = useFlowpeekApi();
const failures = ref<DashboardWorkflowRun[]>([]);
const latestRuns = ref<DashboardWorkflowRun[]>([]);
const trend = ref<WorkflowRunTrendBucket[]>([]);
const isLoading = ref(true);
const error = ref(false);
const range = ref<'7d' | '30d' | '90d'>('30d');

useHead({ title: computed(() => t('dashboard.title')) });

const rangeOptions = computed(() => [
  { label: t('dashboard.last7Days'), value: '7d' },
  { label: t('dashboard.last30Days'), value: '30d' },
  { label: t('dashboard.last90Days'), value: '90d' },
]);

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
