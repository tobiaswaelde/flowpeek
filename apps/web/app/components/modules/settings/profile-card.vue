<template>
  <UCard :ui="{ body: 'space-y-5' }">
    <template #header>
      <div>
        <h2 class="font-semibold">{{ $t('settings.profile') }}</h2>
        <p class="text-sm text-muted">{{ $t('settings.profileDescription') }}</p>
      </div>
    </template>

    <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" variant="subtle" :title="$t(error)" />
    <UAlert
      v-else-if="saved"
      color="success"
      icon="i-lucide-circle-check"
      variant="subtle"
      :title="$t('settings.profileSaved')"
    />

    <UForm class="space-y-5" :schema="updateProfileRequestSchema" :state="form" @submit="save">
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField name="firstName" :label="$t('settings.firstName')">
          <UInput v-model="form.firstName" class="w-full" autocomplete="given-name" :disabled="saving" />
        </UFormField>
        <UFormField name="lastName" :label="$t('settings.lastName')">
          <UInput v-model="form.lastName" class="w-full" autocomplete="family-name" :disabled="saving" />
        </UFormField>
      </div>

      <UFormField name="username" :help="$t('settings.usernameHelp')" :label="$t('settings.username')" required>
        <UInput v-model="form.username" class="w-full" autocomplete="username" :disabled="saving" />
      </UFormField>

      <UFormField
        v-if="usernameChanged"
        name="currentPassword"
        :help="$t('settings.currentPasswordHelp')"
        :label="$t('settings.currentPassword')"
        required
      >
        <UInput
          v-model="form.currentPassword"
          class="w-full"
          autocomplete="current-password"
          type="password"
          :disabled="saving"
        />
      </UFormField>

      <div class="flex justify-end border-t border-default pt-5">
        <UButton
          type="submit"
          icon="i-lucide-save"
          :disabled="usernameChanged && !form.currentPassword"
          :label="$t('settings.profileSave')"
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
import { updateProfileRequestSchema, type UpdateProfileForm } from '~/types/api/auth';

interface ProfileForm {
  currentPassword: string;
  firstName: string;
  lastName: string;
  username: string;
}

const auth = useAuthStore();
const form = reactive<ProfileForm>({
  currentPassword: '',
  firstName: auth.user?.firstName ?? '',
  lastName: auth.user?.lastName ?? '',
  username: auth.user?.username ?? '',
});
const originalUsername = ref(form.username);
const error = ref('');
const saved = ref(false);
const saving = ref(false);
const usernameChanged = computed(() => form.username.trim() !== originalUsername.value);
const { reset: resetDirtyState } = useUnsavedChangesGuard(form);

/** Persist personal identity fields and immediately refresh the authenticated-user store. */
async function save(event: FormSubmitEvent<UpdateProfileForm>): Promise<void> {
  saving.value = true;
  error.value = '';
  saved.value = false;
  try {
    await auth.updateProfile({
      currentPassword: usernameChanged.value ? event.data.currentPassword : undefined,
      firstName: event.data.firstName || null,
      lastName: event.data.lastName || null,
      username: event.data.username,
    });
    Object.assign(form, {
      currentPassword: '',
      firstName: auth.user?.firstName ?? '',
      lastName: auth.user?.lastName ?? '',
      username: auth.user?.username ?? '',
    });
    originalUsername.value = form.username;
    await nextTick();
    resetDirtyState();
    saved.value = true;
  } catch (reason) {
    if (isAxiosError(reason) && reason.response?.status === 409) error.value = 'settings.usernameConflict';
    else if (isAxiosError(reason) && reason.response?.status === 401) error.value = 'settings.currentPasswordInvalid';
    else error.value = 'settings.profileSaveError';
  } finally {
    saving.value = false;
  }
}
</script>
