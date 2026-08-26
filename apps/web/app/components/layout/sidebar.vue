<template>
  <UDashboardSidebar
    id="flowpeek"
    collapsible
    resizable
    class="bg-elevated/25"
    :ui="{ footer: 'flex-col items-stretch' }"
  >
    <template #header="{ collapsed }">
      <UButton
        class="w-full p-0.5"
        color="neutral"
        :label="collapsed ? undefined : 'Flowpeek'"
        :square="collapsed"
        :class="[!collapsed && 'py-2']"
        :block="collapsed"
        to="/"
        variant="ghost"
      >
        <template #leading>
          <span class="flex size-7 items-center justify-center rounded-md bg-primary font-bold text-inverted">F</span>
        </template>
      </UButton>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu
        :aria-label="t('layout.primaryNavigation')"
        :collapsed="collapsed"
        :items="navigationItems"
        orientation="vertical"
        popover
        tooltip
      />
    </template>

    <template #footer="{ collapsed }">
      <div v-if="!collapsed" class="px-2 py-1 text-xs text-muted">{{ t('layout.readOnlyStatus') }}</div>
    </template>
  </UDashboardSidebar>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types';

import { useAuthStore } from '~/store/auth';

const { t } = useI18n();
const auth = useAuthStore();

const navigationItems = computed<NavigationMenuItem[]>(() => {
  const items: NavigationMenuItem[] = [
    {
      icon: 'i-lucide-layout-dashboard',
      label: t('layout.dashboard'),
      to: '/',
    },
    {
      icon: 'i-lucide-bell',
      label: t('layout.notifications'),
      to: '/notifications',
    },
  ];

  if (auth.user?.role === 'SYSTEM_ADMIN') {
    items.push({
      children: [
        { icon: 'i-lucide-plug-zap', label: t('layout.providers'), to: '/admin/providers' },
        { icon: 'i-lucide-git-fork', label: t('layout.repositories'), to: '/admin/repositories' },
        { icon: 'i-lucide-users', label: t('layout.users'), to: '/admin/users' },
      ],
      defaultOpen: true,
      icon: 'i-lucide-settings-2',
      label: t('layout.administration'),
      type: 'trigger',
    });
  }

  return items;
});
</script>
