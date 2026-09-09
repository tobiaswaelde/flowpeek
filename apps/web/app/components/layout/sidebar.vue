<template>
  <UDashboardSidebar
    id="flowpeek"
    collapsible
    resizable
    class="bg-elevated/25"
    role="complementary"
    :default-size="16"
    :aria-label="t('layout.sidebarNavigation')"
    :ui="{ footer: 'flex-col items-stretch' }"
  >
    <template #header="{ collapsed }">
      <UButton
        class="w-full p-0.5"
        color="neutral"
        to="/"
        variant="ghost"
        :label="collapsed ? undefined : 'Flowpeek'"
        :square="collapsed"
        :class="[!collapsed && 'py-2']"
        :block="collapsed"
      >
        <template #leading>
          <span class="flex size-7 items-center justify-center rounded-md bg-primary font-bold text-inverted">F</span>
        </template>
      </UButton>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu
        orientation="vertical"
        :aria-label="t('layout.primaryNavigation')"
        :collapsed="collapsed"
        :items="navigationItems"
        popover
        tooltip
      />
    </template>

    <template #footer="{ collapsed }">
      <div class="flex items-center gap-2 px-2 py-1">
        <p v-if="!collapsed" class="min-w-0 flex-1 text-xs text-muted">{{ t('layout.readOnlyStatus') }}</p>
        <UDashboardSidebarCollapse class="ml-auto" />
      </div>
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
      icon: 'i-lucide-list-tree',
      label: t('layout.workflowRuns'),
      to: '/workflow-runs',
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
        { icon: 'i-lucide-settings', label: t('layout.settings'), to: '/admin/settings' },
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
