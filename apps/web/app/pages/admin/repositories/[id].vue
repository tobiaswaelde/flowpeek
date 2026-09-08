<template>
  <section class="flex min-h-0 flex-1 flex-col">
    <UDashboardToolbar>
      <template #left>
        <UBreadcrumb
          :items="[
            { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
            { icon: 'i-lucide-git-branch', label: $t('layout.repositories'), to: '/admin/repositories' },
            { label: repository ? `${repository.owner}/${repository.name}` : $t('repositoryDetails.title') },
          ]"
        />
      </template>
    </UDashboardToolbar>

    <UAlert
      v-if="loadError"
      class="m-4"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      :title="$t('repositoryDetails.loadError')"
    />

    <div v-else-if="repository" class="grid gap-6 p-4 lg:grid-cols-2">
      <ModulesRepositoriesDetailsGeneralCard :repository="repository" @updated="repository = $event" />
      <ModulesRepositoriesDetailsWorkflowFiltersCard :repository-id="repository.id" />
      <ModulesRepositoriesDetailsMembersCard :repository-id="repository.id" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import type { Repository } from '~/types/api/resources';

definePageMeta({ fullWidth: true });

const route = useRoute();
const api = useFlowpeekApi();
const repositoryId = computed(() => String(route.params.id));
const repository = ref<Repository>();
const loadError = ref(false);

/** Load the repository identity that scopes each details component. */
async function load(): Promise<void> {
  loadError.value = false;
  try {
    const { data } = await api.repositories.get(repositoryId.value);
    repository.value = data;
  } catch {
    loadError.value = true;
  }
}

onMounted(() => void load());
</script>
