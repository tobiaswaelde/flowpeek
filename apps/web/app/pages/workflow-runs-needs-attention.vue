<template>
  <ModulesWorkflowRunsTablePage
    searchable
    banner-id="needs-attention"
    detailed-timestamps
    endpoint="workflow-runs/needs-attention"
    icon="i-lucide-triangle-alert"
    name="workflow-runs-needs-attention"
    :breadcrumbs="[
      { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
      { icon: 'i-lucide-list-tree', label: $t('layout.workflowRuns'), to: '/workflow-runs' },
      { icon: 'i-lucide-triangle-alert', label: $t('needsAttention.title') },
    ]"
    :description="$t('needsAttention.description')"
    :empty="$t('needsAttention.empty')"
    :load-error="$t('needsAttention.loadError')"
    :title="$t('needsAttention.title')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

definePageMeta({ fullWidth: true, path: '/workflow-runs/needs-attention' });

const { t } = useI18n();

useHead({ title: computed(() => t('needsAttention.title')) });
</script>
