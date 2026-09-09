<template>
  <ModulesWorkflowRunsTablePage
    banner-id="workflow-runs"
    endpoint="workflow-runs"
    icon="i-lucide-list-tree"
    name="workflow-runs"
    :breadcrumbs="[
      { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
      { icon: 'i-lucide-list-tree', label: $t('layout.workflowRuns') },
    ]"
    :description="$t('workflowRuns.description')"
    :empty="$t('workflowRuns.empty')"
    :load-error="$t('workflowRuns.loadError')"
    :title="$t('workflowRuns.title')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

definePageMeta({ fullWidth: true });

const { t } = useI18n();

useHead({ title: computed(() => t('workflowRuns.title')) });
</script>
