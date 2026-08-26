<template>
  <UDashboardNavbar :title="title">
    <template #right>
      <LayoutUserMenu />
    </template>
  </UDashboardNavbar>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>
