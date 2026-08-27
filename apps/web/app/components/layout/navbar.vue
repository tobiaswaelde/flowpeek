<template>
  <UDashboardNavbar :ui="{ left: 'flex-1 min-w-0', right: 'gap-2' }">
    <template #left>
      <LayoutGlobalSearch />
    </template>

    <template #right>
      <LayoutNavbarControls />
    </template>
  </UDashboardNavbar>
</template>
