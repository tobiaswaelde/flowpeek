<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useFlowpeekApi } from '~/composables/api/flowpeek-api';
import type { User } from '~/types/api/resources';
const api = useFlowpeekApi();
const users = ref<User[]>([]);
async function load(): Promise<void> {
  users.value = (await api.users.list()).data;
}
async function remove(id: string): Promise<void> {
  await api.users.delete(id);
  await load();
}
onMounted(load);
</script>
<template>
  <section class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">Users</h1>
      <p class="text-sm text-muted">System user administration.</p>
    </div>
    <UCard v-for="user in users" :key="user.id"
      ><div class="flex justify-between">
        <span>{{ user.username }} · {{ user.role }}</span
        ><UButton color="error" label="Delete" variant="ghost" @click="remove(user.id)" /></div
    ></UCard>
  </section>
</template>
