<template>
  <LayoutPage
    :breadcrumbs="[
      { icon: 'i-lucide-layout-dashboard', label: $t('layout.dashboard'), to: '/' },
      { icon: 'i-lucide-bell', label: $t('layout.notifications') },
    ]"
    :description="$t('notifications.description')"
    :title="$t('notifications.title')"
  >
    <template #actions>
      <UButton
        color="neutral"
        icon="i-lucide-refresh-cw"
        variant="soft"
        :label="$t('dashboard.refresh')"
        :loading="loading"
        @click="load"
      />
    </template>

    <UAlert
      v-if="loadError"
      color="error"
      icon="i-lucide-circle-alert"
      variant="subtle"
      :title="$t('notifications.loadError')"
    />
    <UCard>
      <template #header>
        <h2 class="font-semibold">{{ $t('notifications.channels') }}</h2>
      </template>
      <p v-for="channel in channels" :key="channel.id" class="border-b py-2 last:border-0">
        {{ channel.name }} · {{ channel.urlScheme ?? $t('notifications.requiresReconfiguration') }} ·
        {{ channel.enabled ? $t('notifications.enabled') : $t('notifications.disabled') }}
      </p>
    </UCard>
    <UCard>
      <template #header>
        <h2 class="font-semibold">{{ $t('notifications.rules') }}</h2>
      </template>
      <p v-for="rule in rules" :key="rule.id" class="border-b py-2 last:border-0">
        {{ rule.workflowPattern }} · {{ $t(`workflowStatus.${rule.outcome}`) }}
      </p>
    </UCard>
    <UCard>
      <template #header>
        <h2 class="font-semibold">{{ $t('notifications.history') }}</h2>
      </template>
      <p v-for="delivery in deliveries" :key="delivery.id" class="border-b py-2 last:border-0">
        {{ formatDeliveryStatus(delivery.status) }} ·
        {{ $t('notifications.attempts', { count: delivery.attempts.length }) }}
      </p>
    </UCard>
  </LayoutPage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useEzRepoApi } from '~/composables/api/ezrepo-api';
import type { NotificationChannel, NotificationDelivery, NotificationRule } from '~/types/api/resources';

const { t } = useI18n();
const api = useEzRepoApi();
const channels = ref<NotificationChannel[]>([]);
const rules = ref<NotificationRule[]>([]);
const deliveries = ref<NotificationDelivery[]>([]);
const loadError = ref(false);
const loading = ref(false);

definePageMeta({ fullWidth: true });
useHead({ title: computed(() => t('notifications.title')) });

/** Load all notification resources while keeping the page-level refresh action pending. */
async function load(): Promise<void> {
  loading.value = true;
  loadError.value = false;
  try {
    [channels.value, rules.value, deliveries.value] = await Promise.all([
      api.notificationChannels.list().then((response) => response.data),
      api.notificationRules.list().then((response) => response.data),
      api.notificationDeliveries.list().then((response) => response.data),
    ]);
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}
onMounted(() => void load());

/** Translate a persisted notification delivery status for display. */
function formatDeliveryStatus(status: NotificationDelivery['status']): string {
  return t(`notificationDeliveryStatus.${status}`);
}
</script>
