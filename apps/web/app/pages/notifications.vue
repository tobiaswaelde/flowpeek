<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import type { NotificationChannel, NotificationDelivery, NotificationRule } from '~/types/api/resources';

const { t } = useI18n();
const api = useFlowpeekApi();
const channels = ref<NotificationChannel[]>([]);
const rules = ref<NotificationRule[]>([]);
const deliveries = ref<NotificationDelivery[]>([]);
async function load(): Promise<void> {
  [channels.value, rules.value, deliveries.value] = await Promise.all([
    api.notificationChannels.list().then((r) => r.data),
    api.notificationRules.list().then((r) => r.data),
    api.notificationDeliveries.list().then((r) => r.data),
  ]);
}
onMounted(load);

/** Translate a persisted notification delivery status for display. */
function formatDeliveryStatus(status: NotificationDelivery['status']): string {
  return t(`notificationDeliveryStatus.${status}`);
}
</script>
<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">{{ $t('notifications.title') }}</h1>
      <p class="text-sm text-muted">{{ $t('notifications.description') }}</p>
    </div>
    <UCard
      ><template #header
        ><h2 class="font-semibold">{{ $t('notifications.channels') }}</h2></template
      >
      <p v-for="channel in channels" :key="channel.id" class="border-b py-2 last:border-0">
        {{ channel.name }} · {{ channel.type }} ·
        {{ channel.enabled ? $t('notifications.enabled') : $t('notifications.disabled') }}
      </p></UCard
    ><UCard
      ><template #header
        ><h2 class="font-semibold">{{ $t('notifications.rules') }}</h2></template
      >
      <p v-for="rule in rules" :key="rule.id" class="border-b py-2 last:border-0">
        {{ rule.workflowPattern }} · {{ $t(`workflowStatus.${rule.outcome}`) }}
      </p></UCard
    ><UCard
      ><template #header
        ><h2 class="font-semibold">{{ $t('notifications.history') }}</h2></template
      >
      <p v-for="delivery in deliveries" :key="delivery.id" class="border-b py-2 last:border-0">
        {{ formatDeliveryStatus(delivery.status) }} ·
        {{ $t('notifications.attempts', { count: delivery.attempts.length }) }}
      </p></UCard
    >
  </section>
</template>
