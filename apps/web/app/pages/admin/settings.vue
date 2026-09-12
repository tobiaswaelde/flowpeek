<template>
  <LayoutPage
    banner-id="settings"
    icon="i-lucide-settings"
    :breadcrumbs="[
      { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
      { icon: 'i-lucide-settings', label: $t('layout.settings') },
    ]"
    :description="$t('settings.description')"
    :title="$t('settings.title')"
  >
    <ModulesSettingsAvatarCard />

    <UAlert
      v-if="isAdmin && settingsStore.error"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      :title="$t('settings.loadError')"
    >
      <template #actions>
        <UButton
          color="error"
          size="xs"
          variant="soft"
          :label="$t('settings.retry')"
          :loading="settingsStore.loading"
          @click="loadSettings"
        />
      </template>
    </UAlert>

    <UCard v-if="isAdmin" :ui="{ body: 'space-y-6' }">
      <template #header>
        <div>
          <h2 class="font-semibold">{{ $t('settings.general') }}</h2>
          <p class="text-sm text-muted">{{ $t('settings.generalDescription') }}</p>
        </div>
      </template>

      <div v-if="settingsStore.loading && !settingsStore.initialized" class="space-y-5">
        <USkeleton class="h-16 w-full" />
        <USkeleton class="h-20 w-full" />
      </div>
      <UForm v-else class="space-y-6" :schema="applicationSettingsSchema" :state="form" @submit="saveSettings">
        <UAlert
          v-if="saveError"
          color="error"
          icon="i-lucide-circle-alert"
          variant="subtle"
          :title="$t('settings.saveError')"
        />
        <UAlert
          v-else-if="saved"
          color="success"
          icon="i-lucide-circle-check"
          variant="subtle"
          :title="$t('settings.saved')"
        />

        <UFormField
          name="workflowRunRetentionDays"
          :help="$t('settings.retentionHelp')"
          :label="$t('settings.retention')"
          required
        >
          <UInput
            v-model.number="form.workflowRunRetentionDays"
            class="w-full sm:max-w-48"
            inputmode="numeric"
            max="3650"
            min="1"
            type="number"
            :disabled="saving"
          >
            <template #trailing>
              <span class="text-xs text-muted">{{ $t('settings.days') }}</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          name="dateTimeFormat"
          :help="$t('settings.dateTimeFormatHelp')"
          :label="$t('settings.dateTimeFormat')"
          required
        >
          <USelect
            v-model="form.dateTimeFormat"
            class="w-full sm:max-w-md"
            :disabled="saving"
            :items="dateTimeFormatOptions"
          />
        </UFormField>

        <div class="rounded-md bg-elevated p-4">
          <p class="text-xs font-medium tracking-wide text-muted uppercase">{{ $t('settings.preview') }}</p>
          <p class="mt-1 font-mono text-sm">{{ dateTimePreview }}</p>
        </div>

        <div class="flex justify-end border-t border-default pt-6">
          <UButton type="submit" :disabled="settingsStore.error" :label="$t('settings.save')" :loading="saving" />
        </div>
      </UForm>
    </UCard>

    <UCard :ui="{ body: 'space-y-4' }">
      <template #header>
        <div>
          <h2 class="font-semibold">{{ $t('settings.pageIntroductions') }}</h2>
          <p class="text-sm text-muted">{{ $t('settings.pageIntroductionsDescription') }}</p>
        </div>
      </template>

      <UAlert
        v-if="restoreError"
        color="error"
        icon="i-lucide-circle-alert"
        variant="subtle"
        :title="$t('settings.restoreBannersError')"
      />
      <UAlert
        v-else-if="restored"
        color="success"
        icon="i-lucide-circle-check"
        variant="subtle"
        :title="$t('settings.bannersRestored')"
      />

      <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="text-sm text-muted">
          {{ $t('settings.dismissedBanners', { count: userPreferences.dismissedIntroBannerIds.length }) }}
        </p>
        <UButton
          color="neutral"
          icon="i-lucide-rotate-ccw"
          variant="soft"
          :disabled="userPreferences.dismissedIntroBannerIds.length === 0"
          :label="$t('settings.restoreBanners')"
          :loading="restoring"
          @click="restoreBanners"
        />
      </div>
    </UCard>

    <ModulesMcpTokenManagementCard />
  </LayoutPage>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { computed, onMounted, reactive, ref } from 'vue';

import { useUnsavedChangesGuard } from '~/composables/use-unsaved-changes-guard';
import { useAuthStore } from '~/store/auth';
import { useSettingsStore } from '~/store/settings';
import { useUserPreferencesStore } from '~/store/user-preferences';
import { applicationSettingsSchema, defaultDateTimeFormats, type ApplicationSettings } from '~/types/api/resources';
import { formatDateTimeValue } from '~/utils/date-time';

definePageMeta({ fullWidth: true });

const previewTimestamp = '2026-09-09T13:05:00.000Z';
const { locale, t } = useI18n();
const auth = useAuthStore();
const settingsStore = useSettingsStore();
const userPreferences = useUserPreferencesStore();
const form = reactive<ApplicationSettings>({ ...settingsStore.settings });
const restoreError = ref(false);
const restored = ref(false);
const restoring = ref(false);
const saveError = ref(false);
const saved = ref(false);
const saving = ref(false);
const { reset: resetDirtyState } = useUnsavedChangesGuard(form);
const isAdmin = computed(() => auth.user?.role === 'SYSTEM_ADMIN');
const dateTimeFormatOptions = computed(() =>
  defaultDateTimeFormats.map((format) => ({ label: t(`settings.dateTimeFormats.${format}`), value: format })),
);
const dateTimePreview = computed(() => formatDateTimeValue(previewTimestamp, form.dateTimeFormat, locale.value, 'UTC'));

useHead({ title: t('settings.title') });

/** Load persisted settings and initialize the editable form snapshot. */
async function loadSettings(): Promise<void> {
  if (!isAdmin.value) return;
  await settingsStore.load(true);
  if (settingsStore.error) return;
  Object.assign(form, settingsStore.settings);
  resetDirtyState();
}

/** Restore every dismissed introductory banner for only the current authenticated user. */
async function restoreBanners(): Promise<void> {
  restoring.value = true;
  restoreError.value = false;
  restored.value = false;
  try {
    await userPreferences.restoreIntroBanners();
    restored.value = true;
  } catch {
    restoreError.value = true;
  } finally {
    restoring.value = false;
  }
}

/** Persist a validated full global-settings payload. */
async function saveSettings(event: FormSubmitEvent<ApplicationSettings>): Promise<void> {
  saving.value = true;
  saveError.value = false;
  saved.value = false;
  try {
    await settingsStore.update(event.data);
    Object.assign(form, settingsStore.settings);
    resetDirtyState();
    saved.value = true;
  } catch {
    saveError.value = true;
  } finally {
    saving.value = false;
  }
}

onMounted(() => void loadSettings());
</script>
