<template>
  <LayoutPage
    banner-id="repository-details"
    icon="i-lucide-git-branch"
    :breadcrumbs="[
      { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
      { icon: 'i-lucide-git-branch', label: $t('layout.repositories'), to: '/repositories' },
      { label: pageTitle },
    ]"
    :description="isAdmin ? $t('repositoryDetails.generalDescription') : $t('repositories.description')"
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
      <ModulesRepositoriesDetailsGeneralCard
        :editable="isAdmin"
        :repository="repository"
        @updated="repository = $event"
      />
      <ModulesRepositoriesDetailsWorkflowFiltersCard v-if="isAdmin" :repository-id="repository.id" />
      <ModulesRepositoriesDetailsMembersCard v-if="isAdmin" :repository-id="repository.id" />
    </div>
  </LayoutPage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import { useAuthStore } from '~/store/auth';
import type { Repository } from '~/types/api/resources';

definePageMeta({ fullWidth: true });

const route = useRoute();
const api = useFlowpeekApi();
const auth = useAuthStore();
const { t } = useI18n();
const isAdmin = computed(() => auth.user?.role === 'SYSTEM_ADMIN');
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
