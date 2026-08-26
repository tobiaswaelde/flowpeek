<script setup lang="ts">
import { reactive, ref } from 'vue';

import { useAuthStore } from '~/store/auth';
import { signInRequestSchema } from '~/types/api/auth';

definePageMeta({ layout: 'auth' });

const auth = useAuthStore();
const { t } = useI18n();
const credentials = reactive({ password: '', username: '' });
const errorMessage = ref<string | null>(null);
const isSubmitting = ref(false);

useHead({ title: t('auth.signIn') });

/** Validate and submit local credentials, then open the authenticated dashboard. */
async function signIn(): Promise<void> {
  errorMessage.value = null;
  const parsedCredentials = signInRequestSchema.safeParse(credentials);
  if (!parsedCredentials.success) {
    errorMessage.value = t('auth.validationError');
    return;
  }

  isSubmitting.value = true;
  try {
    await auth.signIn(parsedCredentials.data.username, parsedCredentials.data.password);
    await navigateTo('/');
  } catch {
    errorMessage.value = t('auth.invalidCredentials');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UCard class="w-full max-w-md">
    <template #header>
      <div class="space-y-1">
        <h1 class="text-xl font-semibold">{{ $t('auth.signIn') }}</h1>
        <p class="text-sm text-muted">{{ $t('auth.signInDescription') }}</p>
      </div>
    </template>

    <form class="space-y-5" @submit.prevent="signIn">
      <UAlert v-if="errorMessage" color="error" :description="errorMessage" icon="i-lucide-circle-alert" />

      <UFormField :label="$t('auth.username')" name="username" required>
        <UInput v-model="credentials.username" autocomplete="username" class="w-full" icon="i-lucide-user" />
      </UFormField>

      <UFormField :label="$t('auth.password')" name="password" required>
        <UInput
          v-model="credentials.password"
          autocomplete="current-password"
          class="w-full"
          icon="i-lucide-key-round"
          type="password"
        />
      </UFormField>

      <UButton block :label="$t('auth.signIn')" :loading="isSubmitting" type="submit" />
    </form>
  </UCard>
</template>
