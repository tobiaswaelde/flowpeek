<template>
  <UCard :ui="{ body: 'space-y-5' }">
    <template #header>
      <div>
        <h2 class="font-semibold">{{ $t('settings.passwordChange') }}</h2>
        <p class="text-sm text-muted">{{ $t('settings.passwordChangeDescription') }}</p>
      </div>
    </template>

    <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" variant="subtle" :title="$t(error)" />
    <UAlert
      v-else-if="saved"
      color="success"
      icon="i-lucide-circle-check"
      variant="subtle"
      :title="$t('settings.passwordChanged')"
    />

    <UForm class="space-y-5" :schema="localizedPasswordFormSchema" :state="form" @submit="save">
      <UFormField name="currentPassword" :label="$t('settings.currentPassword')" required>
        <UInput
          v-model="form.currentPassword"
          class="w-full"
          autocomplete="current-password"
          type="password"
          :disabled="saving"
        />
      </UFormField>
      <UFormField
        name="newPassword"
        :help="$t('auth.passwordRequirements')"
        :label="$t('settings.newPassword')"
        required
      >
        <UInput
          v-model="form.newPassword"
          class="w-full"
          autocomplete="new-password"
          type="password"
          :disabled="saving"
        />
      </UFormField>
      <UFormField name="confirmPassword" :label="$t('auth.confirmPassword')" required>
        <UInput
          v-model="form.confirmPassword"
          class="w-full"
          autocomplete="new-password"
          type="password"
          :disabled="saving"
        />
      </UFormField>
      <div class="flex justify-end border-t border-default pt-5">
        <UButton
          type="submit"
          icon="i-lucide-key-round"
          :label="$t('settings.passwordChangeSubmit')"
          :loading="saving"
        />
      </div>
    </UForm>
  </UCard>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { isAxiosError } from 'axios';
import { computed, nextTick, reactive, ref } from 'vue';

import { useUnsavedChangesGuard } from '~/composables/use-unsaved-changes-guard';
import { useAuthStore } from '~/store/auth';
import { createUpdatePasswordFormSchema, type UpdatePasswordForm } from '~/types/api/auth';

const auth = useAuthStore();
const { t } = useI18n();
const localizedPasswordFormSchema = computed(() => createUpdatePasswordFormSchema(t('auth.passwordMismatch')));
const error = ref('');
const saved = ref(false);
const saving = ref(false);
const form = reactive({ confirmPassword: '', currentPassword: '', newPassword: '' });
const { reset: resetDirtyState } = useUnsavedChangesGuard(form);

/** Change the password while replacing the invalidated browser access token. */
async function save(event: FormSubmitEvent<UpdatePasswordForm>): Promise<void> {
  error.value = '';
  saved.value = false;
  saving.value = true;
  try {
    await auth.updatePassword({ currentPassword: event.data.currentPassword, newPassword: event.data.newPassword });
    Object.assign(form, { confirmPassword: '', currentPassword: '', newPassword: '' });
    await nextTick();
    resetDirtyState();
    saved.value = true;
  } catch (reason) {
    error.value =
      isAxiosError(reason) && reason.response?.status === 401
        ? 'settings.currentPasswordInvalid'
        : 'settings.passwordChangeError';
  } finally {
    saving.value = false;
  }
}
</script>
