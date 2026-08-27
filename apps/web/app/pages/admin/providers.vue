<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import { useUnsavedChangesGuard } from '~/composables/use-unsaved-changes-guard';
import {
  providerOAuthFormSchema,
  providerPatFormSchema,
  type ProviderAccount,
  type ProviderType,
} from '~/types/api/resources';

type AuthenticationMethod = 'OAUTH' | 'PAT';

const api = useFlowpeekApi();
const route = useRoute();
const providers = ref<ProviderAccount[]>([]);
const loading = ref(true);
const submitting = ref(false);
const connectionError = ref(false);
const oauthProviderTypes = ref<ProviderType[]>([]);
const authenticationMethod = ref<AuthenticationMethod>('PAT');
const form = reactive({ accessToken: '', displayName: '', providerType: 'GITHUB' as ProviderType });
const { reset: resetDirtyState } = useUnsavedChangesGuard(form);
const oauthStatus = computed(() => route.query.oauth);
const oauthAvailable = computed(() => oauthProviderTypes.value.includes(form.providerType));
const usePat = computed(() => !oauthAvailable.value || authenticationMethod.value === 'PAT');
const providerFormSchema = computed(() => (usePat.value ? providerPatFormSchema : providerOAuthFormSchema));
const providerTypeOptions: Array<{ icon: string; label: string; value: ProviderType }> = [
  { icon: 'i-tabler-brand-github', label: 'GitHub', value: 'GITHUB' },
  { icon: 'i-tabler-brand-gitlab', label: 'GitLab', value: 'GITLAB' },
  { icon: 'i-tabler-brand-gnu', label: 'Forgejo', value: 'FORGEJO' },
];
const authenticationOptions = computed(() => [
  { icon: 'i-tabler-key', label: $t('providers.authenticationOAuth'), value: 'OAUTH' },
  { icon: 'i-tabler-password', label: $t('providers.authenticationPat'), value: 'PAT' },
]);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [accounts, authenticationOptions] = await Promise.all([
      api.providerAccounts.list(),
      api.providerAccounts.authenticationOptions(),
    ]);
    providers.value = accounts.data;
    oauthProviderTypes.value = authenticationOptions.data.oauthProviderTypes;
    if (oauthProviderTypes.value.length) authenticationMethod.value = 'OAUTH';
  } finally {
    loading.value = false;
  }
}
async function addProvider(): Promise<void> {
  submitting.value = true;
  connectionError.value = false;
  try {
    if (usePat.value) {
      await api.providerAccounts.create(form);
      Object.assign(form, { accessToken: '', displayName: '', providerType: 'GITHUB' });
      resetDirtyState();
      await load();
      return;
    }

    const { data } = await api.providerAccounts.authorize(form);
    resetDirtyState();
    window.location.assign(data.authorizationUrl);
  } catch {
    connectionError.value = true;
  } finally {
    submitting.value = false;
  }
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
    <UAlert v-if="oauthStatus === 'connected'" color="success" :title="$t('providers.oauthConnected')" />
    <UAlert v-else-if="oauthStatus === 'failed' || connectionError" color="error" :title="$t('providers.oauthError')" />
    <UCard class="max-w-3xl">
      <template #header>
        <div class="space-y-1">
          <h2 class="font-semibold">{{ $t('providers.connect') }}</h2>
          <p class="text-sm text-muted">{{ $t('providers.connectDescription') }}</p>
        </div>
      </template>

      <UForm :schema="providerFormSchema" :state="form" class="space-y-6" @submit="addProvider">
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="$t('providers.name')" name="displayName">
            <UInput v-model="form.displayName" :placeholder="$t('providers.namePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('providers.type')" name="providerType">
            <USelect
              v-model="form.providerType"
              :items="providerTypeOptions"
              :placeholder="$t('providers.typePlaceholder')"
              class="w-full"
            />
          </UFormField>
        </div>

        <USeparator />

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField v-if="oauthAvailable" :label="$t('providers.authentication')">
            <USelect v-model="authenticationMethod" :items="authenticationOptions" class="w-full" />
          </UFormField>
          <UFormField v-if="usePat" :label="$t('providers.accessToken')" name="accessToken">
            <UInput
              v-model="form.accessToken"
              :placeholder="$t('providers.accessTokenPlaceholder')"
              autocomplete="off"
              class="w-full"
              type="password"
            />
          </UFormField>
        </div>

        <div class="flex justify-end border-t border-default pt-4">
          <UButton
            :disabled="submitting"
            :label="usePat ? $t('providers.add') : $t('providers.connect')"
            :loading="submitting"
            type="submit"
          />
        </div>
      </UForm>
    </UCard>

    <div v-if="loading" class="grid gap-3">
      <USkeleton v-for="index in 2" :key="index" class="h-20" />
    </div>
    <UCard v-else-if="!providers.length">
      <p class="py-4 text-center text-sm text-muted">{{ $t('providers.empty') }}</p>
    </UCard>
    <UCard v-for="provider in providers" v-else :key="provider.id">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="font-medium">{{ provider.displayName }}</p>
          <UBadge class="mt-1" color="neutral" size="sm" variant="subtle">{{ provider.providerType }}</UBadge>
        </div>
        <div class="flex gap-2">
          <UButton
            :label="provider.enabled ? $t('providers.disable') : $t('providers.enable')"
            variant="ghost"
            @click="toggle(provider)"
          /><UButton color="error" :label="$t('providers.delete')" variant="ghost" @click="remove(provider.id)" />
        </div>
      </div>
    </UCard>
  </section>
</template>
