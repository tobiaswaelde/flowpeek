<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import type { ProviderAccount } from '~/types/api/resources';
const api = useFlowpeekApi();
const providers = ref<ProviderAccount[]>([]);
const loading = ref(true);
const form = reactive({ accessToken: '', displayName: '', providerType: 'GITHUB' as const });
async function load(): Promise<void> {
  loading.value = true;
  try {
    providers.value = (await api.providerAccounts.list()).data;
  } finally {
    loading.value = false;
  }
}
async function create(): Promise<void> {
  await api.providerAccounts.create(form);
  Object.assign(form, { accessToken: '', displayName: '', providerType: 'GITHUB' });
  await load();
}
async function remove(id: string): Promise<void> {
  await api.providerAccounts.delete(id);
  await load();
}
async function toggle(provider: ProviderAccount): Promise<void> {
  await api.providerAccounts.update(provider.id, { enabled: !provider.enabled });
  await load();
}
onMounted(load);
</script>
<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">{{ $t('providers.title') }}</h1>
      <p class="text-sm text-muted">{{ $t('providers.description') }}</p>
    </div>
    <UCard
      ><template #header
        ><h2 class="font-semibold">{{ $t('providers.add') }}</h2></template
      >
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="create">
        <UFormField :label="$t('providers.name')"><UInput v-model="form.displayName" required /></UFormField
        ><UFormField :label="$t('providers.type')"
          ><select v-model="form.providerType" class="rounded border p-2">
            <option value="GITHUB">GitHub</option>
            <option value="GITLAB">GitLab</option>
            <option value="FORGEJO">Forgejo</option>
          </select></UFormField
        ><UFormField :label="$t('providers.accessToken')"
          ><UInput v-model="form.accessToken" required type="password" /></UFormField
        ><UButton :label="$t('providers.add')" type="submit" /></form
    ></UCard>
    <UCard v-for="provider in providers" :key="provider.id"
      ><div class="flex justify-between">
        <div>
          <p class="font-medium">{{ provider.displayName }}</p>
          <p class="text-sm text-muted">{{ provider.providerType }}</p>
        </div>
        <div class="flex gap-2">
          <UButton
            :label="provider.enabled ? $t('providers.disable') : $t('providers.enable')"
            variant="ghost"
            @click="toggle(provider)"
          /><UButton color="error" :label="$t('providers.delete')" variant="ghost" @click="remove(provider.id)" />
        </div></div
    ></UCard>
  </section>
</template>
