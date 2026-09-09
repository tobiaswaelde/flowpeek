<template>
  <LayoutPage
    banner-id="repository-details"
    icon="i-lucide-git-branch"
    :breadcrumbs="[
      { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
      { icon: 'i-lucide-git-branch', label: $t('layout.repositories'), to: '/admin/repositories' },
      { label: pageTitle },
    ]"
    :description="$t('repositoryDetails.generalDescription')"
    :title="pageTitle"
  >
    <template v-if="repository" #actions>
      <UButton
        color="neutral"
        icon="i-tabler-external-link"
        rel="noreferrer"
        target="_blank"
        variant="soft"
        :label="$t('dashboard.openProvider')"
        :to="repository.url"
      />
    </template>

    <UAlert
      v-if="loadError"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      :title="$t('repositoryDetails.loadError')"
    />

    <div v-else-if="repository" class="grid gap-6 lg:grid-cols-2">
      <ModulesRepositoriesDetailsGeneralCard :repository="repository" @updated="repository = $event" />
      <ModulesRepositoriesDetailsWorkflowFiltersCard :repository-id="repository.id" />
      <ModulesRepositoriesDetailsMembersCard :repository-id="repository.id" />
    </div>
  </LayoutPage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import type { Repository } from '~/types/api/resources';

definePageMeta({ fullWidth: true });

const route = useRoute();
const api = useFlowpeekApi();
const { t } = useI18n();
const repositoryId = computed(() => String(route.params.id));
const repository = ref<Repository>();
const loadError = ref(false);
const pageTitle = computed(() =>
  repository.value ? `${repository.value.owner}/${repository.value.name}` : t('repositoryDetails.title'),
);

useHead({ title: pageTitle });

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
