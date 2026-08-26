<script setup lang="ts">
const route = useRoute();
const { t } = useI18n();

const pageTitle = computed(() => {
  if (route.path === '/admin/providers') return t('providers.title');
  if (route.path === '/admin/repositories') return t('repositories.title');
  if (route.path === '/admin/users') return t('users.title');
  if (route.path === '/notifications') return t('notifications.title');
  return t('layout.dashboard');
});
</script>

<template>
  <UDashboardGroup class="min-h-screen" storage="local" storage-key="flowpeek" unit="rem">
    <LayoutSidebar />

    <UDashboardPanel id="main" :ui="{ body: 'overflow-y-auto p-0' }">
      <template #header>
        <LayoutNavbar :title="pageTitle" />
      </template>

      <template #body>
        <main class="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          <slot />
        </main>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
