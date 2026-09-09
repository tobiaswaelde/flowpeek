<template>
  <section class="space-y-6">
    <UBreadcrumb
      :items="[
        { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
        { icon: 'i-lucide-list-tree', label: $t('layout.workflowRuns'), to: '/workflow-runs' },
        { icon: 'i-lucide-shield-alert', label: $t('awaitingApproval.title') },
      ]"
    />

    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">{{ $t('awaitingApproval.title') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ $t('awaitingApproval.description') }}</p>
      </div>
      <UButton
        color="neutral"
        icon="i-lucide-refresh-cw"
        variant="soft"
        :label="$t('dashboard.refresh')"
        :loading="loading"
        @click="loadRuns"
      />
    </div>

    <UAlert
      color="warning"
      icon="i-lucide-info"
      variant="subtle"
      :description="$t('awaitingApproval.providerApprovalDescription')"
      :title="$t('awaitingApproval.providerApprovalTitle')"
    />

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted">{{ $t('awaitingApproval.count', { count: filteredRuns.length }) }}</p>
          <UInput
            v-model="search"
            class="w-full sm:w-72"
            icon="i-lucide-search"
            :placeholder="$t('awaitingApproval.searchPlaceholder')"
          />
        </div>
      </template>

      <UAlert
        v-if="loadError"
        class="m-4"
        color="error"
        icon="i-lucide-circle-alert"
        variant="subtle"
        :title="$t('awaitingApproval.loadError')"
      />
      <div v-if="loading && !runs.length" class="space-y-3 p-4">
        <USkeleton v-for="index in 5" :key="index" class="h-12 w-full" />
      </div>
      <div v-else-if="filteredRuns.length" class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-default bg-elevated/50 text-muted">
            <tr>
              <th class="px-4 py-3">{{ $t('dashboard.workflow') }}</th>
              <th class="px-4 py-3">{{ $t('repositories.columns.name') }}</th>
              <th class="px-4 py-3">{{ $t('repositories.addSteps.provider') }}</th>
              <th class="px-4 py-3">{{ $t('awaitingApproval.waitingSince') }}</th>
              <th class="px-4 py-3 text-right">{{ $t('repositories.columns.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="run in filteredRuns" :key="run.id" class="border-b border-default last:border-0">
              <td class="px-4 py-3 font-medium">{{ run.workflowName }}</td>
              <td class="px-4 py-3">{{ run.repository.owner }}/{{ run.repository.name }}</td>
              <td class="px-4 py-3">
                <EnumsProviderTypeBadge variant="subtle" :value="run.provider.providerType" />
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-muted">{{ formatDateTime(run.providerCreatedAt) }}</td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <UButton
                    v-if="run.reviewUrl"
                    color="neutral"
                    icon="i-tabler-external-link"
                    rel="noreferrer"
                    size="sm"
                    target="_blank"
                    variant="ghost"
                    :aria-label="$t('awaitingApproval.openReview')"
                    :label="$t('awaitingApproval.openReview')"
                    :to="run.reviewUrl"
                  />
                  <UButton
                    color="warning"
                    icon="i-tabler-external-link"
                    rel="noreferrer"
                    size="sm"
                    target="_blank"
                    variant="soft"
                    :aria-label="$t('awaitingApproval.approveInProvider')"
                    :label="$t('awaitingApproval.approveInProvider')"
                    :to="run.url"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="px-4 py-12 text-center text-sm text-muted">{{ $t('awaitingApproval.empty') }}</p>
    </UCard>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import { useDateTime } from '~/composables/use-date-time';
import type { DashboardWorkflowRun } from '~/types/api/resources';

const { t } = useI18n();
const api = useFlowpeekApi();
const { formatDateTime } = useDateTime();
const loadError = ref(false);
const loading = ref(true);
const runs = ref<DashboardWorkflowRun[]>([]);
const search = ref('');

useHead({ title: computed(() => t('awaitingApproval.title')) });

const filteredRuns = computed(() => {
  const value = search.value.trim().toLocaleLowerCase();
  if (!value) return runs.value;
  return runs.value.filter((run) =>
    [run.workflowName, run.repository.owner, run.repository.name, run.provider.displayName, run.provider.providerType]
      .join(' ')
      .toLocaleLowerCase()
      .includes(value),
  );
});

/** Load all approval-gated workflow runs visible to the current user. */
async function loadRuns(): Promise<void> {
  loading.value = true;
  loadError.value = false;
  try {
    runs.value = (await api.dashboard.getAwaitingApproval()).data;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => void loadRuns());
</script>
