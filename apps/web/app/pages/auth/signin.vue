<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-xl font-semibold">{{ $t('auth.signIn') }}</h1>
      <p class="text-sm text-muted">{{ $t('auth.signInDescription') }}</p>
    </div>

    <UForm class="space-y-5" :schema="signInRequestSchema" :state="credentials" @submit="signIn">
      <UAlert
        v-if="errorMessage"
        color="error"
        icon="i-lucide-circle-alert"
        variant="subtle"
        :description="errorMessage"
      />

      <UFormField name="username" :label="$t('auth.username')" required>
        <UInput
          v-model="credentials.username"
          autocomplete="username"
          class="w-full"
          icon="i-lucide-user"
          :placeholder="$t('auth.usernamePlaceholder')"
        />
      </UFormField>

      <UFormField name="password" :label="$t('auth.password')" required>
        <UInput
          v-model="credentials.password"
          autocomplete="current-password"
          class="w-full"
          icon="i-lucide-key-round"
          type="password"
          :placeholder="$t('auth.passwordPlaceholder')"
        />
      </UFormField>

      <UButton block type="submit" :label="$t('auth.signIn')" :loading="isSubmitting" />
    </UForm>
  </div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { reactive, ref } from 'vue';

import { useUnsavedChangesGuard } from '~/composables/use-unsaved-changes-guard';
import { useAuthStore } from '~/store/auth';
import { signInRequestSchema, type SignInRequest } from '~/types/api/auth';

definePageMeta({ layout: 'auth' });

const auth = useAuthStore();
const { t } = useI18n();
const credentials = reactive({ password: '', username: '' });
const errorMessage = ref<string | null>(null);
const isSubmitting = ref(false);
const { reset } = useUnsavedChangesGuard(credentials);

useHead({ title: t('auth.signIn') });

/** Validate and submit local credentials, then open the authenticated dashboard. */
async function signIn(event: FormSubmitEvent<SignInRequest>): Promise<void> {
  errorMessage.value = null;

  isSubmitting.value = true;
  try {
    await auth.signIn(event.data.username, event.data.password);
    Object.assign(credentials, { password: '', username: '' });
    reset();
    await navigateTo('/');
  } catch {
    errorMessage.value = t('auth.invalidCredentials');
  } finally {
    isSubmitting.value = false;
  }
}
</script>
