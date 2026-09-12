<template>
  <UCard :ui="{ body: 'space-y-5' }">
    <template #header>
      <div>
        <h2 class="font-semibold">{{ $t('settings.avatar') }}</h2>
        <p class="text-sm text-muted">{{ $t('settings.avatarDescription') }}</p>
      </div>
    </template>

    <UAlert v-if="error" color="error" icon="i-lucide-circle-alert" variant="subtle" :title="error" />
    <UAlert
      v-else-if="saved"
      color="success"
      icon="i-lucide-circle-check"
      variant="subtle"
      :title="$t('settings.avatarSaved')"
    />

    <div v-if="auth.user" class="flex flex-wrap items-center gap-4">
      <CommonUserAvatar
        size="xl"
        :avatar-updated-at="auth.user.avatarUpdatedAt"
        :first-name="auth.user.firstName"
        :last-name="auth.user.lastName"
        :user-id="auth.user.id"
        :username="auth.user.username"
      />
      <UButton
        v-if="auth.user.avatarUpdatedAt"
        color="error"
        icon="i-lucide-trash-2"
        variant="soft"
        :label="$t('settings.avatarRemove')"
        :loading="removing"
        @click="remove"
      />
    </div>

    <UFileUpload
      v-model="selectedFile"
      accept="image/jpeg,image/png,image/webp"
      :description="$t('settings.avatarUploadDescription')"
      :disabled="busy"
      :label="$t('settings.avatarUpload')"
      @update:model-value="handleSelectedFile"
    />

    <div class="flex flex-col gap-2 sm:flex-row">
      <UInput
        v-model="remoteUrl"
        class="flex-1"
        type="url"
        :disabled="busy"
        :placeholder="$t('settings.avatarUrlPlaceholder')"
      />
      <UButton
        icon="i-lucide-download"
        :disabled="!remoteUrl.trim()"
        :label="$t('settings.avatarImport')"
        :loading="importing"
        @click="importRemote"
      />
    </div>

    <ModulesSettingsAvatarCropDialog
      v-if="sourceUrl"
      :open="cropOpen"
      :source="sourceUrl"
      @cropped="save"
      @update:open="handleCropOpen"
    />
  </UCard>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import { useApi } from '~/composables/api/api';
import { useAuthStore } from '~/store/auth';
import type { AuthenticatedUser } from '~/types/api/auth';

const maximumBytes = 2 * 1024 * 1024;
const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const { t } = useI18n();
const api = useApi();
const auth = useAuthStore();
const selectedFile = ref<File | null>();
const remoteUrl = ref('');
const sourceUrl = ref<string>();
const cropOpen = ref(false);
const importing = ref(false);
const removing = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref('');
const busy = computed(() => importing.value || removing.value || saving.value);

/** Validate a selected source and either upload it or open the square crop dialog. */
async function handleSelectedFile(file?: File | null): Promise<void> {
  if (!file) return;
  error.value = '';
  saved.value = false;
  if (file.size > maximumBytes) {
    error.value = t('settings.avatarTooLarge');
    selectedFile.value = null;
    return;
  }
  if (!supportedTypes.includes(file.type)) {
    error.value = t('settings.avatarInvalidType');
    selectedFile.value = null;
    return;
  }
  await prepare(file);
}

/** Import one protected HTTPS source through the API before applying the local crop workflow. */
async function importRemote(): Promise<void> {
  if (importing.value) return;
  error.value = '';
  saved.value = false;
  importing.value = true;
  try {
    const { data } = await api.post<Blob>(
      '/auth/me/avatar/remote-preview',
      { url: remoteUrl.value.trim() },
      { responseType: 'blob' },
    );
    await prepare(new File([data], 'remote-avatar', { type: data.type }));
  } catch {
    error.value = t('settings.avatarImportError');
  } finally {
    importing.value = false;
  }
}

/** Detect source geometry and require an explicit crop only for non-square images. */
async function prepare(file: File): Promise<void> {
  try {
    const { height, width } = await readImageDimensions(file);
    const isSquare = width === height;
    if (isSquare) {
      await save(file);
      return;
    }
    replaceSourceUrl(URL.createObjectURL(file));
    cropOpen.value = true;
  } catch {
    error.value = t('settings.avatarInvalidImage');
  }
}

/** Read source dimensions through the same browser image decoder used by the preview. */
async function readImageDimensions(file: File): Promise<{ height: number; width: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ height: image.naturalHeight, width: image.naturalWidth });
      image.onerror = () => reject(new Error('Image decoding failed.'));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Persist a square source and immediately refresh every current-user avatar surface. */
async function save(file: File): Promise<void> {
  saving.value = true;
  error.value = '';
  saved.value = false;
  try {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.put<AuthenticatedUser>('/auth/me/avatar', form);
    auth.updateUser(data);
    selectedFile.value = null;
    remoteUrl.value = '';
    saved.value = true;
  } catch {
    error.value = t('settings.avatarSaveError');
  } finally {
    saving.value = false;
    replaceSourceUrl(undefined);
  }
}

/** Delete the persisted avatar and switch every surface back to initials. */
async function remove(): Promise<void> {
  removing.value = true;
  error.value = '';
  saved.value = false;
  try {
    const { data } = await api.delete<AuthenticatedUser>('/auth/me/avatar');
    auth.updateUser(data);
    saved.value = true;
  } catch {
    error.value = t('settings.avatarRemoveError');
  } finally {
    removing.value = false;
  }
}

function replaceSourceUrl(nextSource: string | undefined): void {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value);
  sourceUrl.value = nextSource;
}

function handleCropOpen(isOpen: boolean): void {
  cropOpen.value = isOpen;
  if (!isOpen && !saving.value) replaceSourceUrl(undefined);
}

onBeforeUnmount(() => replaceSourceUrl(undefined));
</script>
