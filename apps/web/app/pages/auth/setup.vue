<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-xl font-semibold">{{ $t('auth.setup') }}</h1>
      <p class="text-sm text-muted">{{ $t('auth.setupDescription') }}</p>
    </div>

    <UForm class="space-y-5" :schema="localizedSetupFormSchema" :state="form" @submit="setup">
      <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" variant="subtle" :title="$t(error)" />

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField name="firstName" :label="$t('settings.firstName')">
          <UInput v-model="form.firstName" class="w-full" autocomplete="given-name" :disabled="submitting" />
        </UFormField>
        <UFormField name="lastName" :label="$t('settings.lastName')">
          <UInput v-model="form.lastName" class="w-full" autocomplete="family-name" :disabled="submitting" />
        </UFormField>
      </div>

      <UFormField name="username" :label="$t('auth.username')" required>
        <UInput
          v-model="form.username"
          class="w-full"
          autocomplete="username"
          icon="i-lucide-user"
          :disabled="submitting"
        />
      </UFormField>

      <UFormField name="password" :help="$t('auth.passwordRequirements')" :label="$t('auth.password')" required>
        <UInput
          v-model="form.password"
          class="w-full"
          autocomplete="new-password"
          icon="i-lucide-key-round"
          type="password"
          :disabled="submitting"
        />
      </UFormField>

      <UFormField name="confirmPassword" :label="$t('auth.confirmPassword')" required>
        <UInput
          v-model="form.confirmPassword"
          class="w-full"
          autocomplete="new-password"
          icon="i-lucide-key-round"
          type="password"
          :disabled="submitting"
        />
      </UFormField>

      <UButton block type="submit" :label="$t('auth.setupSubmit')" :loading="submitting" />
    </UForm>
  </div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { isAxiosError } from 'axios';
import { computed, reactive, ref } from 'vue';

import { useAuthStore } from '~/store/auth';
import { createSetupFormSchema, type SetupForm } from '~/types/api/auth';

definePageMeta({ layout: 'auth' });

const auth = useAuthStore();
const { t } = useI18n();
const localizedSetupFormSchema = computed(() => createSetupFormSchema(t('auth.passwordMismatch')));
const error = ref('');
const submitting = ref(false);
const form = reactive({ confirmPassword: '', firstName: '', lastName: '', password: '', username: '' });

useHead({ title: t('auth.setup') });

/** Create the first administrator, persist its session, and open the dashboard. */
async function setup(event: FormSubmitEvent<SetupForm>): Promise<void> {
  error.value = '';
  submitting.value = true;
  try {
    await auth.setup({
      firstName: event.data.firstName || undefined,
      lastName: event.data.lastName || undefined,
      password: event.data.password,
      username: event.data.username,
    });
    await navigateTo('/');
  } catch (reason) {
    error.value =
      isAxiosError(reason) && reason.response?.status === 409 ? 'auth.alreadyInitialized' : 'auth.setupError';
  } finally {
    submitting.value = false;
  }
}
</script>
