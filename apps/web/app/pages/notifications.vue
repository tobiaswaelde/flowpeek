<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import type { NotificationChannel, NotificationDelivery, NotificationRule } from '~/types/api/resources';
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
</script>
<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Notifications</h1>
      <p class="text-sm text-muted">Repository notification channels, rules, and delivery history.</p>
    </div>
    <UCard
      ><template #header><h2 class="font-semibold">Channels</h2></template>
      <p v-for="channel in channels" :key="channel.id" class="border-b py-2 last:border-0">
        {{ channel.name }} · {{ channel.type }} · {{ channel.enabled ? 'Enabled' : 'Disabled' }}
      </p></UCard
    ><UCard
      ><template #header><h2 class="font-semibold">Rules</h2></template>
      <p v-for="rule in rules" :key="rule.id" class="border-b py-2 last:border-0">
        {{ rule.workflowPattern }} · {{ rule.outcome }}
      </p></UCard
    ><UCard
      ><template #header><h2 class="font-semibold">Delivery history</h2></template>
      <p v-for="delivery in deliveries" :key="delivery.id" class="border-b py-2 last:border-0">
        {{ delivery.status }} · {{ delivery.attempts.length }} attempts
      </p></UCard
    >
  </section>
</template>
